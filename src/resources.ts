import type { Leanvox } from "leanvox";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResources(server: McpServer, client: Leanvox) {
  // --- leanvox://voices ---
  server.registerResource(
    "voices",
    "leanvox://voices",
    {
      title: "All Voices",
      description: "List of all available Leanvox TTS voices with IDs, names, models, and preview URLs",
      mimeType: "application/json",
    },
    async (uri) => {
      const voices = await client.voices.list();
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(voices, null, 2),
          },
        ],
      };
    },
  );

  // --- leanvox://voices/curated ---
  server.registerResource(
    "voices-curated",
    "leanvox://voices/curated",
    {
      title: "Curated Pro Voices",
      description: "Curated selection of high-quality Pro voices with preview URLs",
      mimeType: "application/json",
    },
    async (uri) => {
      const voices = await client.voices.listCurated();
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(voices, null, 2),
          },
        ],
      };
    },
  );

  // --- leanvox://generations ---
  server.registerResource(
    "generations",
    "leanvox://generations",
    {
      title: "Generation History",
      description: "Recent TTS generation history with audio URLs and metadata",
      mimeType: "application/json",
    },
    async (uri) => {
      const generations = await client.generations.list();
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
            text: JSON.stringify(generations, null, 2),
          },
        ],
      };
    },
  );

  // --- leanvox://account ---
  server.registerResource(
    "account",
    "leanvox://account",
    {
      title: "Account Info",
      description: "Account balance and usage information",
      mimeType: "application/json",
    },
    async (uri) => {
      const balance = await client.account.balance();
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "application/json",
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
    },
  );
}
