/**
 * Hook Configuration Management
 * Loads and validates hook configuration from ~/.claude-cortex/hooks.json
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { HookConfig, PreCompactConfig, SessionStartConfig } from './types.js';

/**
 * Default configuration values
 */
const DEFAULT_PRE_COMPACT_CONFIG: PreCompactConfig = {
  enabled: true,
  minSalience: 0.30,
  maxMemoriesPerCompact: 5,
  categories: ['architecture', 'pattern', 'error', 'learning'],
  autoTag: 'auto-extracted',
  timeout: 5000,
};

const DEFAULT_SESSION_START_CONFIG: SessionStartConfig = {
  enabled: true,
  maxMemories: 15,
  minSalience: 0.5,
  categories: ['architecture', 'pattern', 'preference'],
  format: 'summary',
  timeout: 3000,
};

const DEFAULT_CONFIG: HookConfig = {
  preCompact: DEFAULT_PRE_COMPACT_CONFIG,
  sessionStart: DEFAULT_SESSION_START_CONFIG,
};

let cachedConfig: HookConfig | null = null;
let cachedMtimeMs: number | null = null;

/**
 * Get the path to the hook configuration file
 */
export function getConfigPath(): string {
  const cortexDir = join(homedir(), '.claude-cortex');
  return join(cortexDir, 'hooks.json');
}

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null
      ) {
        result[key] = deepMerge(target[key], source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
  }

  return result;
}

/**
 * Validate configuration values
 */
function validateConfig(config: Partial<HookConfig>): string[] {
  const errors: string[] = [];

  if (config.preCompact) {
    const pc = config.preCompact;
    if (pc.minSalience !== undefined && (pc.minSalience < 0 || pc.minSalience > 1)) {
      errors.push('preCompact.minSalience must be between 0 and 1');
    }
    if (pc.maxMemoriesPerCompact !== undefined && pc.maxMemoriesPerCompact < 0) {
      errors.push('preCompact.maxMemoriesPerCompact must be non-negative');
    }
    if (pc.timeout !== undefined && (pc.timeout < 0 || pc.timeout > 30000)) {
      errors.push('preCompact.timeout must be between 0 and 30000ms');
    }
  }

  if (config.sessionStart) {
    const ss = config.sessionStart;
    if (ss.minSalience !== undefined && (ss.minSalience < 0 || ss.minSalience > 1)) {
      errors.push('sessionStart.minSalience must be between 0 and 1');
    }
    if (ss.maxMemories !== undefined && ss.maxMemories < 0) {
      errors.push('sessionStart.maxMemories must be non-negative');
    }
    if (ss.timeout !== undefined && (ss.timeout < 0 || ss.timeout > 30000)) {
      errors.push('sessionStart.timeout must be between 0 and 30000ms');
    }
    if (ss.format !== undefined && !['summary', 'detailed', 'minimal'].includes(ss.format)) {
      errors.push('sessionStart.format must be "summary", "detailed", or "minimal"');
    }
  }

  return errors;
}

/**
 * Load hook configuration from file or return defaults
 */
export function loadHookConfig(): HookConfig {
  const configPath = getConfigPath();

  // Return defaults if config file doesn't exist
  if (!existsSync(configPath)) {
    cachedConfig = DEFAULT_CONFIG;
    cachedMtimeMs = null;
    return DEFAULT_CONFIG;
  }

  try {
    const mtimeMs = statSync(configPath).mtimeMs;
    if (cachedConfig && cachedMtimeMs === mtimeMs) {
      return cachedConfig;
    }

    const configData = readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(configData) as Partial<HookConfig>;

    // Validate user configuration
    const errors = validateConfig(userConfig);
    if (errors.length > 0) {
      console.error('[Hook Config] Validation errors, using defaults:', errors);
      cachedConfig = DEFAULT_CONFIG;
      cachedMtimeMs = mtimeMs;
      return DEFAULT_CONFIG;
    }

    // Deep merge with defaults
    const merged = deepMerge(DEFAULT_CONFIG, userConfig);
    cachedConfig = merged;
    cachedMtimeMs = mtimeMs;
    return merged;
  } catch (error) {
    console.error('[Hook Config] Failed to load config, using defaults:', error);
    cachedConfig = DEFAULT_CONFIG;
    cachedMtimeMs = null;
    return DEFAULT_CONFIG;
  }
}

/**
 * Get specific hook configuration
 */
export function getPreCompactConfig(): PreCompactConfig {
  return loadHookConfig().preCompact;
}

export function getSessionStartConfig(): SessionStartConfig {
  return loadHookConfig().sessionStart;
}

/**
 * Check if a hook is enabled
 */
export function isHookEnabled(hookType: 'preCompact' | 'sessionStart'): boolean {
  const config = loadHookConfig();
  return hookType === 'preCompact' ? config.preCompact.enabled : config.sessionStart.enabled;
}
