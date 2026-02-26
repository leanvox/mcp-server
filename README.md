# @leanvox/mcp-server

MCP (Model Context Protocol) server for the [Leanvox](https://leanvox.com) TTS API. Generate speech, stream audio, and create multi-speaker dialogues from any MCP-compatible AI client.

## Quick Start

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

Add this to your MCP client configuration:

| Client | Config file |
|--------|------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Code | `.mcp.json` in your project or `~/.claude.json` |
| Cursor | `.cursor/mcp.json` |
| VS Code | `.vscode/mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |

## Tools

| Tool | Description |
|------|-------------|
| `leanvox_generate` | Generate speech from text. Returns an audio URL. |
| `leanvox_stream` | Stream audio to a local file. |
| `leanvox_dialogue` | Multi-speaker dialogue — great for podcasts and conversations. |
| `leanvox_list_voices` | List available voices, optionally filtered by model. |
| `leanvox_check_balance` | Check account balance and spending. |

## Resources

| URI | Description |
|-----|-------------|
| `leanvox://voices` | All available voices |
| `leanvox://voices/curated` | 14 curated Pro voices |
| `leanvox://generations` | Generation history |
| `leanvox://account` | Balance & usage |

## Prompts

| Prompt | Description |
|--------|-------------|
| `narrate` | Convert text to natural speech |
| `podcast` | Create a multi-speaker podcast from content |
| `voice-clone` | Clone a voice from a reference audio file |

## Tool Definition Files

For custom LLM integrations without MCP, use the tool definition JSON files in the [`tools/`](./tools/) directory:

- **`tools/openai-tools.json`** — OpenAI function calling format
- **`tools/anthropic-tools.json`** — Anthropic tool use format

See [`tools/README.md`](./tools/README.md) for copy-paste examples.

## Works With

- Claude Desktop
- Claude Code
- ChatGPT (via MCP)
- Cursor
- VS Code
- Windsurf
- Any MCP-compatible client

## Configuration

The server reads `LEANVOX_API_KEY` from the environment. Get your API key at [leanvox.com](https://leanvox.com).

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
