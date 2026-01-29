/**
 * Hook Types
 * Type definitions for Claude Code hook integration
 */

/**
 * Hook type identifiers
 */
export type HookType = 'preCompact' | 'sessionStart';

/**
 * Conversation message from Claude Code
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

/**
 * Context provided by Claude Code to hooks
 */
export interface HookContext {
  project: string;
  workingDirectory: string;
  timestamp: string;
  conversationHistory?: ConversationMessage[];
}

/**
 * Input structure for all hooks (from stdin)
 */
export interface HookInput {
  type: HookType;
  context: HookContext;
}

/**
 * Extracted memory candidate from conversation analysis
 */
export interface ExtractedMemory {
  title: string;
  content: string;
  category: string;
  tags: string[];
  salience: number;
  source: string; // e.g., "auto-extracted:preCompact"
}

/**
 * PreCompact hook output
 */
export interface PreCompactOutput {
  success: boolean;
  memoriesExtracted: number;
  memories: Array<{
    id?: string;
    title: string;
    category: string;
    salience: number;
  }>;
  errors?: string[];
  processingTime: number;
}

/**
 * SessionStart hook output
 */
export interface SessionStartOutput {
  success: boolean;
  contextProvided: boolean;
  markdown?: string;
  memoryCount?: number;
  errors?: string[];
  processingTime: number;
}

/**
 * Hook output union type
 */
export type HookOutput = PreCompactOutput | SessionStartOutput;

/**
 * Configuration for PreCompact hook
 */
export interface PreCompactConfig {
  enabled: boolean;
  minSalience: number;
  maxMemoriesPerCompact: number;
  categories: string[];
  autoTag: string;
  timeout: number;
}

/**
 * Configuration for SessionStart hook
 */
export interface SessionStartConfig {
  enabled: boolean;
  maxMemories: number;
  minSalience: number;
  categories: string[];
  format: 'summary' | 'detailed' | 'minimal';
  timeout: number;
}

/**
 * Complete hook configuration
 */
export interface HookConfig {
  preCompact: PreCompactConfig;
  sessionStart: SessionStartConfig;
}

/**
 * Pattern for extracting specific types of content
 */
export interface ExtractionPattern {
  name: string;
  pattern: RegExp;
  category: string;
  salienceBoost: number;
  minLength?: number;
}

/**
 * Result of pattern matching on conversation segment
 */
export interface PatternMatch {
  pattern: ExtractionPattern;
  content: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Analyzed conversation segment
 */
export interface ConversationSegment {
  content: string;
  role: 'user' | 'assistant';
  matches: PatternMatch[];
  salience: number;
  suggestedCategory?: string;
  extractedTags: string[];
}

/**
 * Hook error with context
 */
export interface HookError {
  message: string;
  code: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
}
