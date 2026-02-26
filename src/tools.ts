import type { Leanvox } from "leanvox";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import { formatError } from "./errors.js";

export function registerTools(server: McpServer, client: Leanvox) {
  // --- leanvox_generate ---
  server.registerTool(
    "leanvox_generate",
    {
      title: "Generate Speech",
      description:
        "Generate speech audio from text using the Leanvox TTS API. Returns a URL to the generated audio file.",
      inputSchema: {
        text: z.string().describe("Text to convert to speech (max 10,000 chars)"),
        model: z
          .enum(["standard", "pro"])
          .optional()
          .describe("TTS model. 'standard' for fast/cheap, 'pro' for highest quality with emotion control"),
        voice: z
          .string()
          .optional()
          .describe("Voice ID (e.g. 'af_heart', 'emma', 'james'). Use leanvox_list_voices to see options."),
        language: z
          .string()
          .optional()
          .describe("ISO 639-1 language code (default: 'en')"),
        speed: z
          .number()
          .optional()
          .describe("Playback speed 0.5-2.0 (default: 1.0)"),
        format: z
          .enum(["mp3", "wav"])
          .optional()
          .describe("Audio format (default: 'mp3')"),
      },
    },
    async (args) => {
      try {
        const result = await client.generate(args);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  audioUrl: result.audioUrl,
                  model: result.model,
                  voice: result.voice,
                  characters: result.characters,
                  costCents: result.costCents,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(formatError(error), null, 2) }],
          isError: true,
        };
      }
    },
  );

  // --- leanvox_stream ---
  server.registerTool(
    "leanvox_stream",
    {
      title: "Stream Speech to File",
      description:
        "Stream generated speech audio to a local file. Use this for longer texts where you want the audio saved to disk.",
      inputSchema: {
        text: z.string().describe("Text to convert to speech (max 10,000 chars)"),
        outputPath: z.string().describe("Local file path to save the audio (e.g. './output.mp3')"),
        model: z
          .enum(["standard", "pro"])
          .optional()
          .describe("TTS model. 'standard' for fast/cheap, 'pro' for highest quality"),
        voice: z
          .string()
          .optional()
          .describe("Voice ID (e.g. 'af_heart', 'emma', 'james')"),
        language: z
          .string()
          .optional()
          .describe("ISO 639-1 language code (default: 'en')"),
        speed: z
          .number()
          .optional()
          .describe("Playback speed 0.5-2.0 (default: 1.0)"),
      },
    },
    async (args) => {
      try {
        const { outputPath, ...generateArgs } = args;
        const { writeFile } = await import("node:fs/promises");
        const stream = await client.stream(generateArgs);
        const reader = stream.getReader();
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          totalBytes += value.length;
        }

        const buffer = new Uint8Array(totalBytes);
        let offset = 0;
        for (const chunk of chunks) {
          buffer.set(chunk, offset);
          offset += chunk.length;
        }

        await writeFile(outputPath, buffer);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  outputPath,
                  bytes: totalBytes,
                  message: `Audio saved to ${outputPath}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(formatError(error), null, 2) }],
          isError: true,
        };
      }
    },
  );

  // --- leanvox_dialogue ---
  server.registerTool(
    "leanvox_dialogue",
    {
      title: "Generate Dialogue",
      description:
        "Generate multi-speaker dialogue audio. Each line can use a different voice. Great for podcasts, conversations, and interviews.",
      inputSchema: {
        lines: z
          .array(
            z.object({
              text: z.string().describe("Text for this speaker to say"),
              voice: z.string().describe("Voice ID for this speaker"),
              language: z.string().optional().describe("ISO 639-1 language code"),
              exaggeration: z
                .number()
                .optional()
                .describe("Emotion intensity 0.0-1.0 (pro model only)"),
            }),
          )
          .describe("Array of dialogue lines (minimum 2)"),
        model: z
          .enum(["standard", "pro"])
          .optional()
          .describe("TTS model (default: 'pro')"),
        gapMs: z
          .number()
          .optional()
          .describe("Silence between speakers in milliseconds (default: 500)"),
      },
    },
    async (args) => {
      try {
        const result = await client.dialogue(args);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  audioUrl: result.audioUrl,
                  model: result.model,
                  characters: result.characters,
                  costCents: result.costCents,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(formatError(error), null, 2) }],
          isError: true,
        };
      }
    },
  );

  // --- leanvox_list_voices ---
  server.registerTool(
    "leanvox_list_voices",
    {
      title: "List Voices",
      description:
        "List available TTS voices. Optionally filter by model ('standard' or 'pro'). Returns voice IDs, names, and preview URLs.",
      inputSchema: {
        model: z
          .enum(["standard", "pro"])
          .optional()
          .describe("Filter voices by model"),
      },
    },
    async (args) => {
      try {
        const voices = await client.voices.list(args.model);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(voices, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(formatError(error), null, 2) }],
          isError: true,
        };
      }
    },
  );

  // --- leanvox_check_balance ---
  server.registerTool(
    "leanvox_check_balance",
    {
      title: "Check Balance",
      description:
        "Check the current account balance and total spending. Returns balance in cents.",
      inputSchema: {},
    },
    async () => {
      try {
        const balance = await client.account.balance();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  balanceCents: balance.balanceCents,
                  totalSpentCents: balance.totalSpentCents,
                  balanceFormatted: `$${(balance.balanceCents / 100).toFixed(2)}`,
                  totalSpentFormatted: `$${(balance.totalSpentCents / 100).toFixed(2)}`,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify(formatError(error), null, 2) }],
          isError: true,
        };
      }
    },
  );
}
