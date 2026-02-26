import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

export function registerPrompts(server: McpServer) {
  // --- narrate ---
  server.registerPrompt(
    "narrate",
    {
      title: "Narrate Text",
      description: "Convert text to natural speech using Leanvox TTS",
      argsSchema: {
        text: z.string().describe("The text to narrate"),
        voice: z.string().optional().describe("Voice ID to use (e.g. 'af_heart', 'emma')"),
        model: z.enum(["standard", "pro"]).optional().describe("TTS model to use"),
      },
    },
    async ({ text, voice, model }) => {
      const voiceHint = voice ? ` using the "${voice}" voice` : "";
      const modelHint = model ? ` with the ${model} model` : "";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Convert the following text to natural speech${voiceHint}${modelHint}. Use the leanvox_generate tool to create the audio.\n\nText:\n${text}`,
            },
          },
        ],
      };
    },
  );

  // --- podcast ---
  server.registerPrompt(
    "podcast",
    {
      title: "Create Podcast",
      description: "Create a multi-speaker podcast from content",
      argsSchema: {
        content: z.string().describe("The content or topic for the podcast"),
        speakers: z
          .string()
          .optional()
          .describe("Comma-separated speaker voice IDs (e.g. 'emma,james')"),
      },
    },
    async ({ content, speakers }) => {
      const speakerHint = speakers
        ? `\nUse these voices for the speakers: ${speakers}`
        : "\nUse leanvox_list_voices first to pick appropriate voices for each speaker.";
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Create a multi-speaker podcast from the following content. Write a natural dialogue script, then use the leanvox_dialogue tool to generate the audio.${speakerHint}\n\nContent:\n${content}`,
            },
          },
        ],
      };
    },
  );

  // --- voice-clone ---
  server.registerPrompt(
    "voice-clone",
    {
      title: "Clone Voice",
      description: "Clone a voice from a reference audio file",
      argsSchema: {
        audioPath: z.string().describe("Path to the reference audio file"),
        name: z.string().describe("Name for the cloned voice"),
      },
    },
    async ({ audioPath, name }) => {
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Clone a voice from the audio file at "${audioPath}" and name it "${name}". Note: Voice cloning requires the Leanvox Pro model and costs $3.00 to unlock. After cloning, use the new voice ID with leanvox_generate to create speech.`,
            },
          },
        ],
      };
    },
  );
}
