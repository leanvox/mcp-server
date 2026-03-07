import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "../src/tools.js";
import { registerResources } from "../src/resources.js";
import { registerPrompts } from "../src/prompts.js";

// --- Mock node:fs/promises ---
vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// --- Mock the leanvox module ---
vi.mock("leanvox", () => {
  class LeanvoxError extends Error {
    code: string;
    statusCode: number;
    body?: unknown;
    constructor(message: string, code: string, statusCode: number, body?: unknown) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
      this.body = body;
    }
  }

  const mockClient = {
    generate: vi.fn(),
    stream: vi.fn(),
    dialogue: vi.fn(),
    voices: {
      list: vi.fn(),
      listCurated: vi.fn(),
    },
    generations: {
      list: vi.fn(),
    },
    account: {
      balance: vi.fn(),
    },
  };

  return {
    Leanvox: vi.fn(() => mockClient),
    LeanvoxError,
    __mockClient: mockClient,
  };
});

// Get mock reference
async function getMockClient() {
  const mod = await import("leanvox") as any;
  return mod.__mockClient;
}

async function createTestEnv() {
  const mockClient = await getMockClient();

  const server = new McpServer({ name: "leanvox-test", version: "0.1.0" });
  registerTools(server, mockClient as any);
  registerResources(server, mockClient as any);
  registerPrompts(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "1.0.0" });

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return { server, client, mockClient };
}

// ===== TOOLS =====

describe("leanvox_generate", () => {
  it("returns audio URL and metadata on success", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.generate.mockResolvedValueOnce({
      audioUrl: "https://cdn.leanvox.com/audio/abc123.mp3",
      model: "standard",
      voice: "af_heart",
      characters: 12,
      costCents: 0.5,
    });

    const result = await client.callTool({
      name: "leanvox_generate",
      arguments: { text: "Hello world!" },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.audioUrl).toBe("https://cdn.leanvox.com/audio/abc123.mp3");
    expect(parsed.model).toBe("standard");
    expect(parsed.characters).toBe(12);
    expect(mockClient.generate).toHaveBeenCalledWith({ text: "Hello world!" });
  });

  it("passes all optional parameters", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.generate.mockResolvedValueOnce({
      audioUrl: "https://cdn.leanvox.com/audio/xyz.mp3",
      model: "pro",
      voice: "emma",
      characters: 5,
      costCents: 1.2,
    });

    await client.callTool({
      name: "leanvox_generate",
      arguments: {
        text: "Hello",
        model: "pro",
        voice: "emma",
        language: "en",
        speed: 1.5,
        format: "wav",
      },
    });

    expect(mockClient.generate).toHaveBeenCalledWith({
      text: "Hello",
      model: "pro",
      voice: "emma",
      language: "en",
      speed: 1.5,
      format: "wav",
    });
  });

  it("returns structured error on API failure", async () => {
    const { client, mockClient } = await createTestEnv();
    const { LeanvoxError } = await import("leanvox") as any;
    mockClient.generate.mockRejectedValueOnce(
      new LeanvoxError("Not enough credits", "insufficient_balance", 402),
    );

    const result = await client.callTool({
      name: "leanvox_generate",
      arguments: { text: "Hello" },
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.code).toBe("insufficient_balance");
    expect(parsed.recoverable).toBe(true);
    expect(parsed.status).toBe(402);
    expect(parsed.suggestion).toContain("balance");
  });
});

describe("leanvox_stream", () => {
  it("streams audio to file and returns path and bytes", async () => {
    const { client, mockClient } = await createTestEnv();
    const mockData = new Uint8Array([1, 2, 3, 4, 5]);

    mockClient.stream.mockResolvedValueOnce(
      new ReadableStream({
        start(controller) {
          controller.enqueue(mockData);
          controller.close();
        },
      }),
    );

    const result = await client.callTool({
      name: "leanvox_stream",
      arguments: { text: "Hello", outputPath: "/tmp/test.mp3" },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.outputPath).toBe("/tmp/test.mp3");
    expect(parsed.bytes).toBe(5);
  });
});

describe("leanvox_dialogue", () => {
  it("generates multi-speaker dialogue", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.dialogue.mockResolvedValueOnce({
      audioUrl: "https://cdn.leanvox.com/audio/dialogue.mp3",
      model: "pro",
      characters: 40,
      costCents: 3.0,
    });

    const result = await client.callTool({
      name: "leanvox_dialogue",
      arguments: {
        lines: [
          { text: "Welcome!", voice: "emma" },
          { text: "Thanks!", voice: "james" },
        ],
        model: "pro",
        gapMs: 300,
      },
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.audioUrl).toBe("https://cdn.leanvox.com/audio/dialogue.mp3");
    expect(mockClient.dialogue).toHaveBeenCalledWith({
      lines: [
        { text: "Welcome!", voice: "emma" },
        { text: "Thanks!", voice: "james" },
      ],
      model: "pro",
      gapMs: 300,
    });
  });
});

describe("leanvox_list_voices", () => {
  it("returns voice list", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.voices.list.mockResolvedValueOnce({
      standardVoices: [{ voiceId: "af_heart", name: "Heart" }],
      proVoices: [{ voiceId: "emma", name: "Emma" }],
      clonedVoices: [],
    });

    const result = await client.callTool({
      name: "leanvox_list_voices",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.standardVoices).toHaveLength(1);
    expect(parsed.proVoices).toHaveLength(1);
  });

  it("filters by model when provided", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.voices.list.mockResolvedValueOnce({
      standardVoices: [{ voiceId: "af_heart", name: "Heart" }],
      proVoices: [],
      clonedVoices: [],
    });

    await client.callTool({
      name: "leanvox_list_voices",
      arguments: { model: "standard" },
    });

    expect(mockClient.voices.list).toHaveBeenCalledWith("standard");
  });
});

describe("leanvox_check_balance", () => {
  it("returns formatted balance", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.account.balance.mockResolvedValueOnce({
      balanceCents: 1250,
      totalSpentCents: 5000,
    });

    const result = await client.callTool({
      name: "leanvox_check_balance",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.balanceCents).toBe(1250);
    expect(parsed.balanceFormatted).toBe("$12.50");
    expect(parsed.totalSpentFormatted).toBe("$50.00");
  });

  it("returns structured error on auth failure", async () => {
    const { client, mockClient } = await createTestEnv();
    const { LeanvoxError } = await import("leanvox") as any;
    mockClient.account.balance.mockRejectedValueOnce(
      new LeanvoxError("Invalid API key", "invalid_api_key", 401),
    );

    const result = await client.callTool({
      name: "leanvox_check_balance",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const content = result.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0].text);
    expect(parsed.code).toBe("invalid_api_key");
    expect(parsed.recoverable).toBe(false);
  });
});

// ===== RESOURCES =====

describe("resources", () => {
  it("lists all registered resources", async () => {
    const { client } = await createTestEnv();
    const resources = await client.listResources();

    const uris = resources.resources.map((r) => r.uri);
    expect(uris).toContain("leanvox://voices");
    expect(uris).toContain("leanvox://voices/curated");
    expect(uris).toContain("leanvox://generations");
    expect(uris).toContain("leanvox://account");
  });

  it("reads leanvox://voices", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.voices.list.mockResolvedValueOnce({
      standardVoices: [{ voiceId: "af_heart", name: "Heart" }],
      proVoices: [],
      clonedVoices: [],
    });

    const result = await client.readResource({ uri: "leanvox://voices" });
    const content = result.contents[0];
    expect(content.mimeType).toBe("application/json");
    const parsed = JSON.parse(content.text as string);
    expect(parsed.standardVoices).toHaveLength(1);
  });

  it("reads leanvox://voices/curated", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.voices.listCurated.mockResolvedValueOnce([
      { voiceId: "emma", name: "Emma", previewUrl: "https://example.com/emma.mp3" },
    ]);

    const result = await client.readResource({ uri: "leanvox://voices/curated" });
    const parsed = JSON.parse(result.contents[0].text as string);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].voiceId).toBe("emma");
  });

  it("reads leanvox://generations", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.generations.list.mockResolvedValueOnce({
      generations: [{ id: "gen_1", model: "standard", characters: 100 }],
      total: 1,
    });

    const result = await client.readResource({ uri: "leanvox://generations" });
    const parsed = JSON.parse(result.contents[0].text as string);
    expect(parsed.total).toBe(1);
  });

  it("reads leanvox://account", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.account.balance.mockResolvedValueOnce({
      balanceCents: 500,
      totalSpentCents: 200,
    });

    const result = await client.readResource({ uri: "leanvox://account" });
    const parsed = JSON.parse(result.contents[0].text as string);
    expect(parsed.balanceCents).toBe(500);
    expect(parsed.balanceFormatted).toBe("$5.00");
  });
});

// ===== PROMPTS =====

describe("prompts", () => {
  it("lists all registered prompts", async () => {
    const { client } = await createTestEnv();
    const prompts = await client.listPrompts();

    const names = prompts.prompts.map((p) => p.name);
    expect(names).toContain("narrate");
    expect(names).toContain("podcast");
    expect(names).toContain("voice-clone");
  });

  it("resolves narrate prompt", async () => {
    const { client } = await createTestEnv();
    const result = await client.getPrompt({
      name: "narrate",
      arguments: { text: "Hello world", voice: "emma", model: "pro" },
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain("Hello world");
    expect(text).toContain("emma");
    expect(text).toContain("pro");
    expect(text).toContain("leanvox_generate");
  });

  it("resolves podcast prompt", async () => {
    const { client } = await createTestEnv();
    const result = await client.getPrompt({
      name: "podcast",
      arguments: { content: "AI in healthcare", speakers: "emma,james" },
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain("AI in healthcare");
    expect(text).toContain("emma,james");
    expect(text).toContain("leanvox_dialogue");
  });

  it("resolves voice-clone prompt", async () => {
    const { client } = await createTestEnv();
    const result = await client.getPrompt({
      name: "voice-clone",
      arguments: { audioPath: "/path/to/audio.wav", name: "My Voice" },
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain("/path/to/audio.wav");
    expect(text).toContain("My Voice");
  });
});

// ===== ERROR HANDLING =====

describe("error handling", () => {
  it("handles rate limit errors", async () => {
    const { client, mockClient } = await createTestEnv();
    const { LeanvoxError } = await import("leanvox") as any;
    mockClient.generate.mockRejectedValueOnce(
      new LeanvoxError("Too many requests", "rate_limit_exceeded", 429),
    );

    const result = await client.callTool({
      name: "leanvox_generate",
      arguments: { text: "Hello" },
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse((result.content as any)[0].text);
    expect(parsed.code).toBe("rate_limit_exceeded");
    expect(parsed.recoverable).toBe(true);
    expect(parsed.suggestion).toContain("retry");
  });

  it("handles unknown errors gracefully", async () => {
    const { client, mockClient } = await createTestEnv();
    mockClient.generate.mockRejectedValueOnce(new Error("Network timeout"));

    const result = await client.callTool({
      name: "leanvox_generate",
      arguments: { text: "Hello" },
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse((result.content as any)[0].text);
    expect(parsed.code).toBe("unknown_error");
    expect(parsed.message).toBe("Network timeout");
    expect(parsed.recoverable).toBe(true);
  });

  it("handles server errors", async () => {
    const { client, mockClient } = await createTestEnv();
    const { LeanvoxError } = await import("leanvox") as any;
    mockClient.voices.list.mockRejectedValueOnce(
      new LeanvoxError("Internal server error", "server_error", 500),
    );

    const result = await client.callTool({
      name: "leanvox_list_voices",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse((result.content as any)[0].text);
    expect(parsed.code).toBe("server_error");
    expect(parsed.recoverable).toBe(true);
  });
});

// ===== TOOLS LISTING =====

describe("tool listing", () => {
  it("exposes all 5 tools", async () => {
    const { client } = await createTestEnv();
    const tools = await client.listTools();

    const names = tools.tools.map((t) => t.name);
    expect(names).toContain("leanvox_generate");
    expect(names).toContain("leanvox_stream");
    expect(names).toContain("leanvox_dialogue");
    expect(names).toContain("leanvox_list_voices");
    expect(names).toContain("leanvox_transcribe");
    expect(names).toContain("leanvox_check_balance");
    expect(names).toHaveLength(9);
  });

  it("each tool has a description and input schema", async () => {
    const { client } = await createTestEnv();
    const tools = await client.listTools();

    for (const tool of tools.tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});
