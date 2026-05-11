# Leanvox Tool Definitions

Pre-built tool/function definitions for integrating Leanvox TTS into LLM applications.

## OpenAI / GPT

Use `openai-tools.json` with the OpenAI Chat Completions API:

```python
import json

with open("tools/openai-tools.json") as f:
    tools = json.load(f)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Read this aloud: Hello world!"}],
    tools=tools,
)
```

```typescript
import tools from "./tools/openai-tools.json";

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Read this aloud: Hello world!" }],
  tools,
});
```

## Anthropic / Claude

Use `anthropic-tools.json` with the Anthropic Messages API:

```python
import json

with open("tools/anthropic-tools.json") as f:
    tools = json.load(f)

response = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "Read this aloud: Hello world!"}],
)
```

```typescript
import tools from "./tools/anthropic-tools.json";

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 1024,
  tools,
  messages: [{ role: "user", content: "Read this aloud: Hello world!" }],
});
```

## Available Tools

| Tool | Description |
|------|-------------|
| `leanvox_generate` | Generate speech from text — returns audio URL |
| `leanvox_stream` | Stream audio to a local file |
| `leanvox_dialogue` | Multi-speaker dialogue generation |
| `leanvox_list_voices` | List available TTS voices |
| `leanvox_transcribe` | Transcribe audio or schedule async STT jobs |
| `leanvox_get_job` | Get async TTS/STT job status |
| `leanvox_list_jobs` | List async TTS/STT jobs |
| `leanvox_check_balance` | Check account balance |

## Handling Tool Calls

When the LLM calls a Leanvox tool, execute the corresponding Leanvox API call and return the result:

```typescript
import { Leanvox } from "leanvox";

const leanvox = new Leanvox(); // uses LEANVOX_API_KEY env var

async function handleToolCall(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "leanvox_generate":
      return await leanvox.generate(args);
    case "leanvox_dialogue":
      return await leanvox.dialogue(args);
    case "leanvox_list_voices":
      return await leanvox.voices.list(args.model);
    case "leanvox_transcribe":
      return await leanvox.audio.transcribe(args);
    case "leanvox_get_job":
      return await leanvox.getJob(args.jobId);
    case "leanvox_list_jobs":
      return await leanvox.listJobs(args);
    case "leanvox_check_balance":
      return await leanvox.account.balance();
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```
