/**
 * Hook Utilities
 * Shared utilities for stdin parsing, output formatting, logging, and error handling
 */

import { HookInput, HookOutput, HookError, HookConfig } from './types.js';

/**
 * Read and parse JSON from stdin
 */
export async function readStdin(): Promise<HookInput> {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      try {
        const parsed = JSON.parse(data) as HookInput;
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Failed to parse stdin JSON: ${error}`));
      }
    });

    process.stdin.on('error', (error) => {
      reject(new Error(`Failed to read stdin: ${error}`));
    });
  });
}

/**
 * Write JSON output to stdout
 */
export function writeOutput(output: HookOutput): void {
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Write markdown output to stdout (for SessionStart)
 */
export function writeMarkdown(markdown: string): void {
  console.log(markdown);
}

/**
 * Log hook events to stderr (doesn't interfere with stdout)
 */
export function logHook(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  config?: Partial<HookConfig>
): void {
  // Only log if we're in a terminal or if explicitly enabled
  if (!process.stderr.isTTY) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[Hook ${level.toUpperCase()}] ${timestamp}:`;
  console.error(`${prefix} ${message}`);
}

/**
 * Create a structured hook error
 */
export function createHookError(
  message: string,
  code: string,
  recoverable: boolean = true,
  context?: Record<string, unknown>
): HookError {
  return {
    message,
    code,
    recoverable,
    context,
  };
}

/**
 * Safe hook operation wrapper with timeout protection
 */
export async function safeHookOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  timeout: number,
  operationName: string = 'operation'
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
  });

  try {
    const result = await Promise.race([operation(), timeoutPromise]);
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logHook('error', `${operationName} failed: ${errorMessage}`);
    return fallback;
  }
}

/**
 * Validate hook input structure
 */
export function validateHookInput(input: any): input is HookInput {
  if (!input || typeof input !== 'object') {
    return false;
  }

  if (!input.type || !['preCompact', 'sessionStart'].includes(input.type)) {
    return false;
  }

  if (!input.context || typeof input.context !== 'object') {
    return false;
  }

  const { context } = input;
  if (!context.project || !context.workingDirectory || !context.timestamp) {
    return false;
  }

  // PreCompact requires conversation history
  if (input.type === 'preCompact') {
    if (!Array.isArray(context.conversationHistory)) {
      return false;
    }
  }

  return true;
}

/**
 * Format error for output
 */
export function formatErrorOutput(error: unknown, hookType: string): HookOutput {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (hookType === 'preCompact') {
    return {
      success: false,
      memoriesExtracted: 0,
      memories: [],
      errors: [errorMessage],
      processingTime: 0,
    };
  } else {
    return {
      success: false,
      contextProvided: false,
      errors: [errorMessage],
      processingTime: 0,
    };
  }
}

/**
 * Measure execution time
 */
export function measureTime<T>(fn: () => T): { result: T; time: number } {
  const start = Date.now();
  const result = fn();
  const time = Date.now() - start;
  return { result, time };
}

/**
 * Measure async execution time
 */
export async function measureTimeAsync<T>(
  fn: () => Promise<T>
): Promise<{ result: T; time: number }> {
  const start = Date.now();
  const result = await fn();
  const time = Date.now() - start;
  return { result, time };
}

/**
 * Truncate text to maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Extract first N words from text
 */
export function extractWords(text: string, count: number): string {
  const words = text.split(/\s+/);
  return words.slice(0, count).join(' ');
}

/**
 * Clean and normalize text for processing
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, '  ') // Convert tabs to spaces
    .trim();
}

/**
 * Generate a title from content (first sentence or N words)
 */
export function generateTitle(content: string, maxLength: number = 80): string {
  const normalized = normalizeText(content);

  // Try to get first sentence
  const sentenceMatch = normalized.match(/^[^.!?]+[.!?]/);
  if (sentenceMatch) {
    const title = sentenceMatch[0].trim();
    if (title.length <= maxLength) {
      return title;
    }
  }

  // Fall back to first N words
  const words = normalized.split(/\s+/).slice(0, 10);
  let title = words.join(' ');

  if (title.length > maxLength) {
    title = title.substring(0, maxLength - 3) + '...';
  }

  return title;
}
