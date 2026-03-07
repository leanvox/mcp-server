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
          .enum(["standard", "pro", "max"])
          .optional()
          .describe("TTS model. 'standard' for fast/cheap, 'pro' for highest quality with emotion control, 'max' for instruction-based voice design"),
        voice: z
          .string()
          .optional()
          .describe("Voice ID (standard/pro only). Use leanvox_list_voices to see all options."),
        voiceInstructions: z
          .string()
          .optional()
          .describe("Natural language voice description (max model only, max 300 chars). E.g. 'A warm, confident female narrator with a slight British accent'. Mutually exclusive with voice."),
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
                  ...(result.generatedVoiceId ? { generatedVoiceId: result.generatedVoiceId } : {}),
                  ...(result.suggestion ? { suggestion: result.suggestion } : {}),
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
          .enum(["standard", "pro", "max"])
          .optional()
          .describe("TTS model. 'standard' for fast/cheap, 'pro' for highest quality, 'max' for instruction-based voice design"),
        voice: z
          .string()
          .optional()
          .describe("Voice ID (standard/pro only)"),
        voiceInstructions: z
          .string()
          .optional()
          .describe("Natural language voice description (max model only, max 300 chars). Mutually exclusive with voice."),
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
        "Generate multi-speaker dialogue audio. Each line MUST use a different voice for each speaker. For standard/pro, use voice IDs (call leanvox_list_voices first). For max model, use voiceInstructions to describe each voice in natural language.",
      inputSchema: {
        lines: z
          .array(
            z.object({
              text: z.string().describe("Text for this speaker to say"),
              voice: z.string().optional().describe("Voice ID (standard/pro). Each speaker MUST have a unique voice."),
              voiceInstructions: z.string().optional().describe("Natural language voice description (max model only). E.g. 'Warm female podcast host'. Mutually exclusive with voice."),
              language: z.string().optional().describe("ISO 639-1 language code"),
              exaggeration: z
                .number()
                .optional()
                .describe("Emotion intensity 0.0-1.0 (pro model only)"),
            }),
          )
          .describe("Array of dialogue lines (minimum 2)"),
        model: z
          .enum(["standard", "pro", "max"])
          .optional()
          .describe("TTS model (default: 'pro'). Use 'max' with voiceInstructions per line."),
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
        "List available TTS voices. Optionally filter by model ('standard' or 'pro'). Returns voice IDs, names, and preview URLs. Note: Max model doesn't use voice IDs — use voiceInstructions to describe voices in natural language instead.",
      inputSchema: {
        model: z
          .enum(["standard", "pro"])
          .optional()
          .describe("Filter voices by model (max model uses voiceInstructions instead of voice IDs)"),
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

  // --- leanvox_transcribe ---
  server.registerTool(
    "leanvox_transcribe",
    {
      title: "Transcribe Audio",
      description:
        "Transcribe an audio file with speaker diarization and optional AI summarization. Supports mp3, wav, ogg, flac, m4a, webm. Returns transcript with speaker labels, and optionally a summary with action items and topics.",
      inputSchema: {
        filePath: z.string().describe("Path to the audio file to transcribe"),
        language: z
          .string()
          .optional()
          .describe("ISO 639-1 language code (auto-detect if omitted)"),
        features: z
          .array(z.string())
          .optional()
          .describe("Features to enable. Default: ['transcript', 'diarization']. Add 'summary' for AI summary with action items."),
        numSpeakers: z
          .number()
          .optional()
          .describe("Hint for expected number of speakers"),
      },
    },
    async (args) => {
      try {
        const result = await client.audio.transcribe({
          file: args.filePath,
          language: args.language,
          features: args.features,
          numSpeakers: args.numSpeakers,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: result.id,
                  durationSeconds: result.duration_seconds,
                  language: result.language,
                  formattedTranscript: result.formatted_transcript,
                  speakers: result.speakers,
                  ...(result.summary ? { summary: result.summary } : {}),
                  usage: result.usage,
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

  // --- leanvox_voice_clone ---
  server.registerTool(
    "leanvox_voice_clone",
    {
      title: "Clone Voice",
      description:
        "Clone a voice from an audio file. Requires 5-30 seconds of clear speech. Cloned voices cost $3.00 to unlock for TTS use. Returns the cloned voice ID.",
      inputSchema: {
        name: z.string().describe("Name for the cloned voice (max 100 chars)"),
        audioPath: z.string().describe("Path to audio file with voice sample (5-30s of clear speech, WAV/MP3, max 10MB)"),
      },
    },
    async (args) => {
      try {
        const { readFileSync } = await import("node:fs");
        const audioBuffer = readFileSync(args.audioPath);
        const audioBase64 = Buffer.from(audioBuffer).toString("base64");
        const result = await client.voices.clone({ name: args.name, audioBase64 });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ...result,
                  message: `Voice "${args.name}" cloned successfully. Use the voice ID with leanvox_generate (model: pro). Note: costs $3.00 to unlock.`,
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

  // --- leanvox_voice_design ---
  server.registerTool(
    "leanvox_voice_design",
    {
      title: "Design Voice",
      description:
        "Design a custom voice using natural language description. The AI generates a voice matching your description. First design is free, then $1.00 each. Returns the designed voice ID when ready.",
      inputSchema: {
        name: z.string().describe("Name for the designed voice (max 100 chars)"),
        prompt: z.string().describe("Natural language description of the voice (max 500 chars). E.g. 'A warm, elderly male voice with a gentle storytelling tone'"),
        language: z.string().optional().describe("Voice language (default: 'English')"),
        description: z.string().optional().describe("Optional notes about intended use"),
      },
    },
    async (args) => {
      try {
        const result = await client.voices.design({
          name: args.name,
          prompt: args.prompt,
          language: args.language,
          description: args.description,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  ...result,
                  message: `Voice design "${args.name}" started. It will be ready in about 1 minute. Use the voice ID with leanvox_generate (model: pro).`,
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

  // --- leanvox_voiceover ---
  server.registerTool(
    "leanvox_voiceover",
    {
      title: "Voice-Over (Re-voice Audio)",
      description:
        "Transcribe an audio file and re-voice it with different voices. Chains transcription (with speaker diarization) → multi-speaker dialogue generation. Perfect for dubbing, re-voicing meetings, or creating alternate versions of audio content.",
      inputSchema: {
        filePath: z.string().describe("Path to the audio file to transcribe and re-voice"),
        voiceMap: z
          .record(z.string(), z.string())
          .optional()
          .describe("Map speaker labels to voice IDs. E.g. {'Speaker 1': 'narrator_warm_male', 'Speaker 2': 'af_heart'}. Unmapped speakers use defaultVoice."),
        defaultVoice: z
          .string()
          .optional()
          .describe("Voice ID for speakers not in voiceMap (default: 'narrator_warm_male')"),
        model: z
          .enum(["standard", "pro", "max"])
          .optional()
          .describe("TTS model for re-voicing (default: 'pro')"),
        gapMs: z
          .number()
          .optional()
          .describe("Silence between speakers in ms (default: 500)"),
        language: z
          .string()
          .optional()
          .describe("Language hint for transcription (auto-detect if omitted)"),
        numSpeakers: z
          .number()
          .optional()
          .describe("Expected number of speakers"),
      },
    },
    async (args) => {
      try {
        const result = await client.voiceover({
          file: args.filePath,
          voiceMap: args.voiceMap,
          defaultVoice: args.defaultVoice,
          model: args.model,
          gapMs: args.gapMs,
          language: args.language,
          numSpeakers: args.numSpeakers,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  transcription: {
                    id: result.transcription.id,
                    durationSeconds: result.transcription.duration_seconds,
                    language: result.transcription.language,
                    speakers: result.transcription.speakers,
                    formattedTranscript: result.transcription.formatted_transcript,
                  },
                  audio: {
                    audioUrl: result.audio.audioUrl,
                    model: result.audio.model,
                    characters: result.audio.characters,
                    costCents: result.audio.costCents,
                  },
                  voiceMap: result.voiceMap,
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
