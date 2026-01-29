/**
 * SessionStart Hook - Context Injection Logic
 * Generates and formats project context for session initialization
 */

import { SessionStartConfig } from './types.js';
import { Memory, MemoryConfig, DEFAULT_CONFIG } from '../memory/types.js';
import { searchMemories, getRecentMemories } from '../memory/store.js';

/**
 * Context summary structure
 */
export interface ContextData {
  keyDecisions: Memory[];
  activePatterns: Memory[];
  userPreferences: Memory[];
  pendingItems: Memory[];
  recentActivity: Memory[];
}

/**
 * Generate context data for a project
 */
export async function generateSessionContext(
  project: string,
  config: SessionStartConfig
): Promise<ContextData> {
  const memoryConfig: MemoryConfig = DEFAULT_CONFIG;

  // Fetch key decisions (architecture)
  const keyDecisions = (await searchMemories(
    {
      query: '',
      project,
      category: 'architecture',
      minSalience: config.minSalience,
      limit: Math.floor(config.maxMemories * 0.33), // ~33% of max
    },
    memoryConfig
  )).map(r => r.memory);

  // Fetch active patterns
  const activePatterns = (await searchMemories(
    {
      query: '',
      project,
      category: 'pattern',
      minSalience: config.minSalience,
      limit: Math.floor(config.maxMemories * 0.27), // ~27% of max
    },
    memoryConfig
  )).map(r => r.memory);

  // Fetch user preferences
  const userPreferences = (await searchMemories(
    {
      query: '',
      project,
      category: 'preference',
      minSalience: config.minSalience,
      limit: Math.floor(config.maxMemories * 0.2), // ~20% of max
    },
    memoryConfig
  )).map(r => r.memory);

  // Fetch pending items (todos)
  const pendingItems = (await searchMemories(
    {
      query: '',
      project,
      category: 'todo',
      limit: Math.floor(config.maxMemories * 0.13), // ~13% of max
    },
    memoryConfig
  )).map(r => r.memory);

  // Fetch recent activity
  const recentActivity = getRecentMemories(
    Math.floor(config.maxMemories * 0.13), // ~13% of max
    project
  );

  return {
    keyDecisions,
    activePatterns,
    userPreferences,
    pendingItems,
    recentActivity,
  };
}

/**
 * Format context as markdown (summary format)
 */
export function formatSummaryContext(
  project: string,
  context: ContextData
): string {
  const lines: string[] = [];

  lines.push(`## Project Context: ${project}`);
  lines.push('');

  // Key Decisions
  if (context.keyDecisions.length > 0) {
    lines.push('### Key Decisions');
    for (const memory of context.keyDecisions) {
      const preview = memory.content.length > 100
        ? memory.content.slice(0, 100) + '...'
        : memory.content;
      lines.push(`- **${memory.title}**: ${preview}`);
    }
    lines.push('');
  }

  // Active Patterns
  if (context.activePatterns.length > 0) {
    lines.push('### Active Patterns');
    for (const memory of context.activePatterns) {
      const preview = memory.content.length > 80
        ? memory.content.slice(0, 80) + '...'
        : memory.content;
      lines.push(`- **${memory.title}**: ${preview}`);
    }
    lines.push('');
  }

  // User Preferences
  if (context.userPreferences.length > 0) {
    lines.push('### Your Preferences');
    for (const memory of context.userPreferences) {
      lines.push(`- ${memory.title}`);
    }
    lines.push('');
  }

  // Pending Items
  if (context.pendingItems.length > 0) {
    lines.push('### Pending Items');
    for (const memory of context.pendingItems) {
      lines.push(`- [ ] ${memory.title}`);
    }
    lines.push('');
  }

  // Recent Activity (only show titles)
  if (context.recentActivity.length > 0) {
    lines.push('### Recent Activity');
    for (const memory of context.recentActivity.slice(0, 5)) {
      lines.push(`- ${memory.title} (${memory.category})`);
    }
  }

  return lines.join('\n');
}

/**
 * Format context as markdown (detailed format)
 */
export function formatDetailedContext(
  project: string,
  context: ContextData
): string {
  const lines: string[] = [];

  lines.push(`# Project Context: ${project}`);
  lines.push('');

  // Key Decisions
  if (context.keyDecisions.length > 0) {
    lines.push('## Architecture & Decisions');
    lines.push('');
    for (const memory of context.keyDecisions) {
      lines.push(`### ${memory.title}`);
      lines.push(memory.content);
      lines.push(`*Salience: ${(memory.salience * 100).toFixed(0)}% | Tags: ${memory.tags.join(', ') || 'none'}*`);
      lines.push('');
    }
  }

  // Active Patterns
  if (context.activePatterns.length > 0) {
    lines.push('## Active Patterns');
    lines.push('');
    for (const memory of context.activePatterns) {
      lines.push(`### ${memory.title}`);
      lines.push(memory.content);
      lines.push('');
    }
  }

  // User Preferences
  if (context.userPreferences.length > 0) {
    lines.push('## Your Preferences');
    lines.push('');
    for (const memory of context.userPreferences) {
      lines.push(`### ${memory.title}`);
      lines.push(memory.content);
      lines.push('');
    }
  }

  // Pending Items
  if (context.pendingItems.length > 0) {
    lines.push('## Pending Items');
    lines.push('');
    for (const memory of context.pendingItems) {
      lines.push(`### ${memory.title}`);
      lines.push(memory.content);
      lines.push('');
    }
  }

  // Recent Activity
  if (context.recentActivity.length > 0) {
    lines.push('## Recent Activity');
    lines.push('');
    for (const memory of context.recentActivity) {
      lines.push(`- **${memory.title}** (${memory.category})`);
    }
  }

  return lines.join('\n');
}

/**
 * Format context as markdown (minimal format)
 */
export function formatMinimalContext(
  project: string,
  context: ContextData
): string {
  const lines: string[] = [];

  lines.push(`## Context: ${project}`);
  lines.push('');

  const allMemories = [
    ...context.keyDecisions,
    ...context.activePatterns,
    ...context.userPreferences,
  ];

  // Show only the most important items
  if (allMemories.length > 0) {
    lines.push('### Key Context');
    for (const memory of allMemories.slice(0, 8)) {
      lines.push(`- ${memory.title}`);
    }
  }

  // Show pending if any
  if (context.pendingItems.length > 0) {
    lines.push('');
    lines.push('### TODO');
    for (const memory of context.pendingItems.slice(0, 3)) {
      lines.push(`- [ ] ${memory.title}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format context based on requested format
 */
export function formatContext(
  project: string,
  context: ContextData,
  format: 'summary' | 'detailed' | 'minimal'
): string {
  switch (format) {
    case 'detailed':
      return formatDetailedContext(project, context);
    case 'minimal':
      return formatMinimalContext(project, context);
    case 'summary':
    default:
      return formatSummaryContext(project, context);
  }
}

/**
 * Check if context has any meaningful data
 */
export function hasContext(context: ContextData): boolean {
  return (
    context.keyDecisions.length > 0 ||
    context.activePatterns.length > 0 ||
    context.userPreferences.length > 0 ||
    context.pendingItems.length > 0 ||
    context.recentActivity.length > 0
  );
}

/**
 * Get context statistics
 */
export function getContextStats(context: ContextData): {
  totalItems: number;
  byCategory: Record<string, number>;
} {
  const totalItems =
    context.keyDecisions.length +
    context.activePatterns.length +
    context.userPreferences.length +
    context.pendingItems.length +
    context.recentActivity.length;

  const byCategory: Record<string, number> = {
    architecture: context.keyDecisions.length,
    pattern: context.activePatterns.length,
    preference: context.userPreferences.length,
    todo: context.pendingItems.length,
    recent: context.recentActivity.length,
  };

  return { totalItems, byCategory };
}
