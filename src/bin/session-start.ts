#!/usr/bin/env node
/**
 * SessionStart Hook Entry Point
 * Invoked by Claude Code at session start to inject project context
 */

import { HookInput, SessionStartOutput } from '../hooks/types.js';
import { getSessionStartConfig, isHookEnabled } from '../hooks/hook-config.js';
import {
  readStdin,
  writeMarkdown,
  writeOutput,
  validateHookInput,
  formatErrorOutput,
  safeHookOperation,
  measureTimeAsync,
  logHook,
} from '../hooks/utils.js';
import {
  generateSessionContext,
  formatContext,
  hasContext,
  getContextStats,
} from '../hooks/context-injection.js';
import { initDatabase } from '../database/init.js';

/**
 * Main SessionStart hook logic
 */
async function runSessionStartHook(input: HookInput): Promise<SessionStartOutput> {
  const config = getSessionStartConfig();

  // Check if hook is enabled
  if (!config.enabled) {
    logHook('info', 'SessionStart hook disabled in config');
    return {
      success: true,
      contextProvided: false,
      processingTime: 0,
    };
  }

  const { context } = input;
  const project = context.project;

  if (!project || project === '*') {
    logHook('warn', 'No specific project provided, skipping context injection');
    return {
      success: true,
      contextProvided: false,
      processingTime: 0,
    };
  }

  logHook('info', `Loading context for project: ${project}`);

  // Initialize database
  initDatabase();

  // Generate context
  const contextData = await generateSessionContext(project, config);

  // Check if there's any context to show
  if (!hasContext(contextData)) {
    logHook('info', 'No context available for project');
    return {
      success: true,
      contextProvided: false,
      markdown: `*No saved context for project: ${project}*`,
      processingTime: 0,
    };
  }

  // Format context
  const markdown = formatContext(project, contextData, config.format);
  const stats = getContextStats(contextData);

  logHook('info', `Context loaded: ${stats.totalItems} items`);

  return {
    success: true,
    contextProvided: true,
    markdown,
    memoryCount: stats.totalItems,
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

    if (input.type !== 'sessionStart') {
      throw new Error(`Invalid hook type: ${input.type}, expected sessionStart`);
    }

    // Get configuration
    const config = getSessionStartConfig();

    // Run hook with timeout protection
    const { result, time } = await measureTimeAsync(() =>
      safeHookOperation(
        () => runSessionStartHook(input),
        {
          success: false,
          contextProvided: false,
          errors: ['Operation timed out'],
          processingTime: 0,
        },
        config.timeout,
        'SessionStart context generation'
      )
    );

    // Set processing time
    result.processingTime = time;

    // If we have markdown, write it directly (for context injection)
    // Otherwise write JSON output
    if (result.markdown) {
      writeMarkdown(result.markdown);
    } else {
      writeOutput(result);
    }

    // Exit successfully
    process.exit(0);
  } catch (error) {
    // Log error
    logHook('error', `SessionStart hook failed: ${error}`);

    // Write error output
    const errorOutput = formatErrorOutput(error, 'sessionStart');
    writeOutput(errorOutput);

    // Exit with success (hook failures should not break Claude Code)
    process.exit(0);
  }
}

// Run main
main();
