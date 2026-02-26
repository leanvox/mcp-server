#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Leanvox } from "leanvox";
import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

const server = new McpServer({
  name: "leanvox",
  version: "0.1.0",
}, {
  instructions:
    "Leanvox TTS server. Generate speech, stream audio, create multi-speaker dialogues, and manage voices. " +
    "Set the LEANVOX_API_KEY environment variable to authenticate.",
});

const client = new Leanvox();

registerTools(server, client);
registerResources(server, client);
registerPrompts(server);

const transport = new StdioServerTransport();
await server.connect(transport);
