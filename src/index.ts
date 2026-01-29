#!/usr/bin/env node

/**
 * Claude Cortex Core - Minimal MCP Memory Server
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

function parseDbPath(): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && args[i + 1]) {
      return args[i + 1];
    }
  }
  return undefined;
}

async function main() {
  const server = createServer(parseDbPath());
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Failed to start claude-cortex-core:', error);
  process.exit(1);
});
