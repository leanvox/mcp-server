# Leanvox — Agentic AI Integration Spec

> Written by Puno 🧭 | Research + spec for AI agent-friendly API integration
> For review by Juno ⚡

---

## Executive Summary

AI agents need TTS. Our API should be a first-class citizen in the agentic ecosystem. This spec covers **4 integration protocols** we should support, ordered by impact and adoption:

1. **MCP Server** (Model Context Protocol) — highest priority
2. **OpenAI-compatible Function/Tool Definitions** — broadest reach
3. **A2A Agent Card** (Agent-to-Agent Protocol) — emerging standard
4. **OpenAPI + AI Plugin Manifest** — compatibility layer

---

## 1. MCP Server (Model Context Protocol)

### What is it?
Open standard by Anthropic for connecting AI apps to external tools. Think "USB-C for AI." Used by Claude, ChatGPT, Cursor, Windsurf, and growing.

### Why it matters
- **Fastest-growing agent protocol** — supported by Claude Desktop, Claude Code, ChatGPT, Cursor, VS Code, and hundreds of apps
- One MCP server = works with ALL MCP-compatible clients
- Developers can use Leanvox from their AI assistant directly

### What we build: `@leanvox/mcp-server`

**Tools to expose:**

| Tool Name | Description | Key Params |
|---|---|---|
| `leanvox_generate` | Generate speech from text | `text`, `model`, `voice`, `language`, `speed` |
| `leanvox_stream` | Stream audio to file | `text`, `outputPath`, `model`, `voice` |
| `leanvox_dialogue` | Multi-speaker dialogue | `lines[]`, `model`, `gapMs` |
| `leanvox_list_voices` | List available voices | `model?` |
| `leanvox_clone_voice` | Clone a voice from audio | `name`, `audioPath` |
| `leanvox_design_voice` | AI-design a voice from prompt | `name`, `prompt` |
| `leanvox_check_balance` | Check account balance | — |

**Resources to expose:**

| Resource | URI Pattern | Description |
|---|---|---|
| Voices list | `leanvox://voices` | All available voices |
| Curated voices | `leanvox://voices/curated` | 14 curated Pro voices |
| Generation history | `leanvox://generations` | Past generations |
| Account info | `leanvox://account` | Balance, usage |

**Prompts to expose:**

| Prompt | Description |
|---|---|
| `narrate` | "Convert this text to natural speech" |
| `podcast` | "Create a multi-speaker podcast from this content" |
| `voice-clone` | "Clone a voice from a reference audio file" |

### Configuration
```json
{
  "mcpServers": {
    "leanvox": {
      "command": "npx",
      "args": ["@leanvox/mcp-server"],
      "env": {
        "LEANVOX_API_KEY": "lv_live_..."
      }
    }
  }
}
```

### Package
- **npm:** `@leanvox/mcp-server`
- **Python:** `leanvox-mcp` (pip)
- Transport: stdio (local) + SSE (remote/hosted)

---

## 2. OpenAI-Compatible Function/Tool Definitions

### What is it?
JSON Schema tool definitions that work with OpenAI, Anthropic, Google, and any LLM that supports function calling.

### Why it matters
- **Widest compatibility** — every major LLM provider supports this format
- Developers building custom agents can drop in our tool definitions
- Zero runtime dependency — just JSON schemas

### What we build: Tool definition files

```json
{
  "type": "function",
  "function": {
    "name": "leanvox_generate",
    "description": "Generate speech audio from text using Leanvox TTS API. Returns a URL to the generated audio file.",
    "strict": true,
    "parameters": {
      "type": "object",
      "properties": {
        "text": {
          "type": "string",
          "description": "Text to convert to speech (max 10,000 chars)"
        },
        "model": {
          "type": "string",
          "enum": ["standard", "pro"],
          "description": "TTS model. 'standard' for fast/cheap, 'pro' for highest quality with emotion control"
        },
        "voice": {
          "type": "string",
          "description": "Voice ID (e.g. 'af_heart', 'emma', 'james'). Use leanvox_list_voices to see options."
        },
        "language": {
          "type": "string",
          "description": "ISO 639-1 language code (default: 'en')"
        },
        "speed": {
          "type": "number",
          "description": "Playback speed 0.5-2.0 (default: 1.0)"
        }
      },
      "required": ["text"],
      "additionalProperties": false
    }
  }
}
```

### Deliverable
- `tools/openai-tools.json` — Full set of tool definitions
- `tools/anthropic-tools.json` — Anthropic format (same schema, slightly different wrapper)
- `tools/README.md` — Copy-paste guide for each provider
- Available via CDN: `https://api.leanvox.com/.well-known/ai-tools.json`

---

## 3. A2A Agent Card (Agent-to-Agent Protocol)

### What is it?
Google's open protocol for agent-to-agent communication. Agents discover each other via "Agent Cards" and collaborate on tasks without exposing internal state.

### Why it matters
- **Emerging standard** backed by Google, with SDKs in Python, Node, Go, Java, .NET
- Enables Leanvox to be discovered and used by other agents automatically
- Supports long-running tasks (perfect for async TTS generation)
- Complementary to MCP (MCP = tool use, A2A = agent collaboration)

### What we build: Leanvox A2A Agent

**Agent Card** (served at `https://api.leanvox.com/.well-known/agent.json`):

```json
{
  "name": "Leanvox TTS Agent",
  "description": "Text-to-speech generation agent. Converts text to natural speech, creates multi-speaker dialogues, clones voices, and designs AI voices.",
  "url": "https://api.leanvox.com/a2a",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": true
  },
  "skills": [
    {
      "id": "text-to-speech",
      "name": "Text to Speech",
      "description": "Generate speech from text with customizable voice, speed, and emotion",
      "tags": ["tts", "audio", "speech", "voice"]
    },
    {
      "id": "dialogue-generation",
      "name": "Dialogue Generation",
      "description": "Create multi-speaker conversations and podcasts",
      "tags": ["dialogue", "podcast", "multi-speaker"]
    },
    {
      "id": "voice-cloning",
      "name": "Voice Cloning",
      "description": "Clone a voice from a reference audio sample",
      "tags": ["voice", "clone", "custom"]
    },
    {
      "id": "voice-design",
      "name": "AI Voice Design",
      "description": "Design a new voice from a text description",
      "tags": ["voice", "design", "ai"]
    }
  ],
  "authentication": {
    "schemes": ["apiKey"],
    "credentials": "API key via Authorization header"
  }
}
```

### Communication
- JSON-RPC 2.0 over HTTPS
- SSE for streaming responses
- Webhook push for async job completion

---

## 4. OpenAPI + AI Plugin Manifest

### What is it?
Standard OpenAPI 3.1 spec + `.well-known/ai-plugin.json` manifest. Used by ChatGPT plugins (legacy) and many agent frameworks for auto-discovery.

### Why it matters
- Low effort — we likely already have or can auto-generate OpenAPI from our API
- Broadest tooling support (Swagger, Postman, every HTTP client)
- Some agent frameworks still use this for tool discovery

### What we build
- `https://api.leanvox.com/.well-known/openapi.json` — API spec
- `https://api.leanvox.com/.well-known/ai-plugin.json` — Plugin manifest

---

## Priority & Roadmap

| # | Protocol | Priority | Effort | Impact | Timeline |
|---|---|---|---|---|---|
| 1 | **MCP Server** | 🔴 P0 | Medium | Highest — works with Claude, ChatGPT, Cursor | Week 1-2 |
| 2 | **Function/Tool Definitions** | 🔴 P0 | Low | Highest — every LLM supports this | Week 1 |
| 3 | **A2A Agent Card** | 🟡 P1 | Medium | Growing — Google-backed, multi-agent future | Week 3-4 |
| 4 | **OpenAPI + Plugin** | 🟢 P2 | Low | Moderate — compatibility layer | Week 2 |

### Recommended execution order:
1. **Tool definitions first** (days, not weeks) — JSON files, zero infrastructure
2. **MCP server** — npm package, biggest developer reach
3. **OpenAPI spec** — auto-generate from API, serve at well-known URL
4. **A2A agent** — build once MCP is stable, shares same backend logic

---

## Competitive Advantage

Most TTS APIs stop at REST endpoints. By offering MCP + A2A + tool definitions, we become **the TTS API that agents use natively**. An AI assistant can:

1. **Discover** Leanvox via MCP/A2A
2. **Generate speech** without the developer writing any integration code
3. **Stream audio** directly in conversations
4. **Clone voices** as part of agent workflows

This is a massive DX advantage and positions us as **the default TTS for the agentic era**.

---

## 5. LLM-Friendly Error Handling

> Added per Juno's review — agents need structured errors to recover gracefully.

All error responses (MCP, tool calls, A2A) must return structured JSON that LLMs can parse and act on:

```json
{
  "error": {
    "code": "insufficient_balance",
    "message": "Not enough credits to generate audio. Current balance: 50 cents, estimated cost: 120 cents.",
    "status": 402,
    "recoverable": true,
    "suggestion": "Call leanvox_check_balance to see your balance, or use account.buyCredits to add funds.",
    "details": {
      "balance_cents": 50,
      "estimated_cost_cents": 120
    }
  }
}
```

### Required error fields for agent consumption:

| Field | Type | Description |
|---|---|---|
| `code` | string | Machine-readable error code |
| `message` | string | Human/LLM-readable explanation |
| `status` | int | HTTP status code |
| `recoverable` | bool | Can the agent retry or fix this? |
| `suggestion` | string | What the agent should do next |
| `details` | object | Structured data (balance, limits, etc.) |

### Error recovery patterns for agents:

| Error | `recoverable` | Agent action |
|---|---|---|
| `insufficient_balance` | true | Call `buyCredits` or inform user |
| `rate_limit_exceeded` | true | Wait `retryAfter` seconds, retry |
| `invalid_request` | true | Fix params based on `message` |
| `invalid_api_key` | false | Ask user to provide valid key |
| `server_error` | true | Retry with backoff |
| `not_found` | true | List available resources first |

---

## Resolved Decisions (from team review)

| Question | Decision | Decided by |
|---|---|---|
| MCP server language | **TypeScript first**, Python later | Juno + Uuno |
| MCP deployment | **Both local + hosted** | Boss |
| Tool set scope | **Curated essential set** (generate, stream, dialogue, list_voices, check_balance). Advanced tools (clone, design) as separate pack | Uuno + Juno |
| A2A investment | **Minimal** — basic Agent Card at `.well-known/agent.json`, don't over-invest yet | Juno |
| Agent pricing | **Same as direct API** — no special pricing | Juno |
| Tool defs timeline | **Ship same week as MCP** — just JSON files | Juno |

---

*Puno 🧭 — February 26, 2026*
*Reviewed & approved by: Juno ⚡*
*DX feedback by: Uuno 🎨*
