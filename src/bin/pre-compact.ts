#!/usr/bin/env node
/**
 * PreCompact Hook Entry Point
 * Invoked by Claude Code before context compaction to auto-extract memories
 */

import { HookInput, PreCompactOutput } from '../hooks/types.js';
import { getPreCompactConfig, isHookEnabled } from '../hooks/hook-config.js';
import {
  readStdin,
  writeOutput,
  validateHookInput,
  formatErrorOutput,
  safeHookOperation,
  measureTimeAsync,
  logHook,
} from '../hooks/utils.js';
import { extractMemoriesFromConversation } from '../hooks/extraction.js';
import { initDatabase } from '../database/init.js';
import { addMemory, getMemorySummariesForDedupe } from '../memory/store.js';

/**
 * Main PreCompact hook logic
 */
async function runPreCompactHook(input: HookInput): Promise<PreCompactOutput> {
  const config = getPreCompactConfig();

  // Check if hook is enabled
  if (!config.enabled) {
    logHook('info', 'PreCompact hook disabled in config');
    return {
      success: true,
      memoriesExtracted: 0,
      memories: [],
      processingTime: 0,
    };
  }

  const { context } = input;
  const conversationHistory = context.conversationHistory || [];

  if (conversationHistory.length === 0) {
    logHook('warn', 'No conversation history provided');
    return {
      success: true,
      memoriesExtracted: 0,
      memories: [],
      processingTime: 0,
    };
  }

  logHook('info', `Analyzing ${conversationHistory.length} messages for extraction`);

  // Initialize database
  initDatabase();

  // Fetch existing memories to avoid duplicates (no scoring, no side effects)
  const existingMemories = getMemorySummariesForDedupe({
    project: context.project,
    limit: 100,
    includeGlobal: true,
  });

  // Extract memories from conversation
  const extractedMemories = await extractMemoriesFromConversation(
    conversationHistory,
    config,
    existingMemories
  );

  logHook('info', `Extracted ${extractedMemories.length} candidate memories`);

  // Save extracted memories
  const savedMemories: Array<{
    id?: string;
    title: string;
    category: string;
    salience: number;
  }> = [];

  for (const memory of extractedMemories) {
    try {
      const result = addMemory({
        title: memory.title,
        content: memory.content,
        category: memory.category as any,
        tags: memory.tags,
        salience: memory.salience,
        type: 'long_term',
        project: context.project,
        metadata: {
          source: memory.source,
          extractedAt: context.timestamp,
        },
      });

      savedMemories.push({
        id: String(result.id),
        title: memory.title,
        category: memory.category,
        salience: memory.salience,
      });

      logHook('info', `Saved: ${memory.title} (${memory.category}, salience: ${memory.salience.toFixed(2)})`);
    } catch (error) {
      logHook('error', `Failed to save memory: ${error}`);
    }
  }

  return {
    success: true,
    memoriesExtracted: savedMemories.length,
    memories: savedMemories,
    processingTime: 0, // Will be set by measureTimeAsync
  };
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Read input from stdin
    const input = await readStdin();

    // Validate input
    if (!validateHookInput(input)) {
      throw new Error('Invalid hook input structure');
    }

    if (input.type !== 'preCompact') {
      throw new Error(`Invalid hook type: ${input.type}, expected preCompact`);
    }

    // Get configuration
    const config = getPreCompactConfig();

    // Run hook with timeout protection
    const { result, time } = await measureTimeAsync(() =>
      safeHookOperation(
        () => runPreCompactHook(input),
        {
          success: false,
          memoriesExtracted: 0,
          memories: [],
          errors: ['Operation timed out'],
          processingTime: 0,
        },
        config.timeout,
        'PreCompact extraction'
      )
    );

    // Set processing time
    result.processingTime = time;

    // Write output
    writeOutput(result);

    // Exit successfully
    process.exit(0);
  } catch (error) {
    // Log error
    logHook('error', `PreCompact hook failed: ${error}`);

    // Write error output
    const errorOutput = formatErrorOutput(error, 'preCompact');
    writeOutput(errorOutput);

    // Exit with success (hook failures should not break Claude Code)
    process.exit(0);
  }
}

// Run main
main();
