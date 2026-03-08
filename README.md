# leanvox-mcp

> Use Leanvox TTS directly from Claude, ChatGPT, Cursor, and any MCP-compatible AI assistant.

**Zero code. One config line. Instant text-to-speech in your AI tools.**

## Quick Setup

### Claude Desktop

Add to `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "leanvox": {
      "command": "npx",
      "args": ["-y", "leanvox-mcp"],
      "env": {
        "LEANVOX_API_KEY": "lv_live_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. Done. ✨

### Cursor

Settings → MCP → Add Server:

```json
{
  "leanvox": {
    "command": "npx",
    "args": ["-y", "leanvox-mcp"],
    "env": {
      "LEANVOX_API_KEY": "lv_live_your_key_here"
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "leanvox": {
      "command": "npx",
      "args": ["-y", "leanvox-mcp"],
      "env": {
        "LEANVOX_API_KEY": "lv_live_your_key_here"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add leanvox -- npx -y leanvox-mcp
```

Set your API key:

```bash
export LEANVOX_API_KEY="lv_live_your_key_here"
```

---

## What You Can Do

Once connected, just ask your AI assistant in natural language:

> "Read this paragraph aloud using the podcast_conversational_female voice"

> "Create a podcast dialogue between two speakers about AI"

> "Clone my voice from this audio file"

> "What voices are available?"

> "Check my Leanvox balance"

The AI assistant handles everything — no code needed.

---

## Available Tools

| Tool | Description |
|------|-------------|
| `leanvox_generate` | Generate speech from text |
| `leanvox_stream` | Stream audio to a file |
| `leanvox_dialogue` | Create multi-speaker dialogue |
| `leanvox_list_voices` | Browse available voices |
| `leanvox_clone_voice` | Clone a voice from audio |
| `leanvox_design_voice` | Design a voice from a description |
| `leanvox_check_balance` | Check account balance |

## Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Voices | `leanvox://voices` | All available voices |
| Curated | `leanvox://voices/curated` | 14 curated Pro voices |
| History | `leanvox://generations` | Past generations |
| Account | `leanvox://account` | Balance & usage |

## Prompts

| Prompt | Description |
|--------|-------------|
| `narrate` | Convert text to natural speech |
| `podcast` | Create a multi-speaker podcast |
| `voice-clone` | Clone a voice from reference audio |

---

## Authentication

Get your API key at [leanvox.com/dashboard](https://leanvox.com/dashboard).

Pass it via:
1. **Environment variable** `LEANVOX_API_KEY` (recommended)
2. **Config file** `~/.lvox/config.toml`

---

## Requirements

- Node.js 18+
- Leanvox API key ([get one free](https://leanvox.com))

## Standalone Usage

```bash
# Run directly
npx leanvox-mcp

# Or install globally
npm install -g leanvox-mcp
leanvox-mcp
```

## Troubleshooting

**"Tool not found"** — Restart your AI app after adding the config.

**"Authentication error"** — Check your `LEANVOX_API_KEY` is set correctly.

**"Connection refused"** — Make sure Node.js 18+ is installed: `node --version`

---

## Links

- [Leanvox](https://leanvox.com) — Main site
- [API Docs](https://leanvox.com/docs) — Full API reference
- [Python SDK](https://pypi.org/project/leanvox/) — `pip install leanvox`
- [Node.js SDK](https://www.npmjs.com/package/leanvox) — `npm install leanvox`
- [GitHub](https://github.com/leanvox/mcp-server) — Source & issues

---

## License

MIT

*leanvox-mcp — Text-to-speech for the AI era.*
