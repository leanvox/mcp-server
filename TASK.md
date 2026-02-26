# Task: Build @leanvox/mcp-server + Tool Definition JSON files

## Overview
Build a Model Context Protocol (MCP) server for the Leanvox TTS API as an npm package `@leanvox/mcp-server`.
Also create tool definition JSON files for OpenAI and Anthropic function calling formats.

## Reference files in this repo
- `spec.md` — Full agentic integration spec with tools, resources, prompts, error handling
- `api-spec.md` — Leanvox API spec (endpoints, params, responses)

## What to build

### 1. MCP Server (`@leanvox/mcp-server`)

**Package:** `@leanvox/mcp-server` on npm
**Transport:** stdio (local)
**Language:** TypeScript, compile to ESM
**Dependencies:** `@modelcontextprotocol/sdk`, `leanvox` (our Node SDK from npm)

**Tools to expose (curated essential set):**
- `leanvox_generate` — Generate speech from text
- `leanvox_stream` — Stream audio to file
- `leanvox_dialogue` — Multi-speaker dialogue
- `leanvox_list_voices` — List available voices
- `leanvox_check_balance` — Check account balance

**Resources:**
- `leanvox://voices` — All voices
- `leanvox://voices/curated` — Curated Pro voices
- `leanvox://generations` — Generation history
- `leanvox://account` — Balance & usage

**Prompts:**
- `narrate` — "Convert this text to natural speech"
- `podcast` — "Create a multi-speaker podcast from this content"
- `voice-clone` — "Clone a voice from a reference audio file"

**Error handling:** Return structured LLM-friendly errors with `code`, `message`, `recoverable`, `suggestion` fields.

**Config example (for README):**
```json
{
  "mcpServers": {
    "leanvox": {
      "command": "npx",
      "args": ["@leanvox/mcp-server"],
      "env": { "LEANVOX_API_KEY": "lv_live_..." }
    }
  }
}
```

**Binary:** Package should have a `bin` entry so `npx @leanvox/mcp-server` works.

### 2. Tool Definition JSON files

Create in a `tools/` directory:
- `tools/openai-tools.json` — OpenAI function calling format
- `tools/anthropic-tools.json` — Anthropic tool use format
- `tools/README.md` — Copy-paste guide for each provider

Tools to define: generate, stream, dialogue, list_voices, check_balance (same 5 as MCP).

### 3. Tests

Use vitest. Mock the Leanvox client. Test:
- Each tool handler returns correct format
- Error handling returns structured errors
- Resources resolve correctly
- Input validation works

### 4. CI

Create `.github/workflows/test.yml` — test on Node 18/20/22
Create `.github/workflows/publish-npm.yml` — publish on v* tag push with --provenance

### 5. README.md

Professional README with:
- Quick start (npx command + config)
- Available tools, resources, prompts
- Works with: Claude Desktop, Claude Code, ChatGPT, Cursor, VS Code, Windsurf
- Tool definitions section

## Constraints
- Node 18+ (native fetch)
- TypeScript strict mode
- Zero unnecessary dependencies
- Use `leanvox` npm package as the API client
- ESM only (MCP servers are typically ESM)
- Package name: `@leanvox/mcp-server`

## Git
- Commit everything when done
- Git config: user.name "Suno" user.email "sunowest@proton.me"

When completely finished, run this command to notify me:
openclaw system event --text "Done: Built @leanvox/mcp-server MCP package + tool definition JSON files. Ready for review." --mode now
