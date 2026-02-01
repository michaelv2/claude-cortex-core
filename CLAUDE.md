# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Cortex Core is a minimal, production-ready MCP (Model Context Protocol) server that provides persistent brain-like memory for Claude Code. It's a stripped-down fork of `claude-cortex` that removes all non-essential subsystems (dashboard, embeddings, API server) while preserving the complete remember/recall/forget/consolidate pipeline.

**Key characteristics:**
- 3 production dependencies (`@modelcontextprotocol/sdk`, `better-sqlite3`, `zod`)
- Zero network connections
- FTS5 full-text search (no semantic embeddings)
- SQLite with WAL mode at `~/.claude-cortex/memories.db`
- 15 MCP tools for memory operations

## Development Commands

```bash
# Build the project
npm run build

# Development with watch mode
npm run dev

# Start the server (production)
npm start

# Custom database path
node dist/index.js --db /path/to/custom.db
```

## Architecture

### Entry Points
- `src/index.ts` - CLI entry point, parses `--db` flag, creates server via stdio transport
- `src/server.ts` - MCP server configuration, registers all 15 tools/resources/prompts

### Core Memory System

The system implements a brain-like memory architecture with three memory types:

1. **Short-term (STM)** - Recent, working memories (max 100)
2. **Long-term (LTM)** - Consolidated, important memories (max 1000)
3. **Episodic** - Session markers and timestamps

**Memory Flow:**
```
User Input → remember tool → addMemory() → SQLite + FTS5
         ↓
    Auto-categorize (salience.ts)
         ↓
    Auto-link relationships (similarity + tags)
         ↓
    Consolidation (every 4 hours + startup)
         ↓
    STM → LTM promotion (salience ≥ 0.6)
         ↓
    Decay & deletion (category-specific thresholds)
```

### Key Modules

**`src/memory/store.ts`** - Core CRUD operations
- `addMemory()` - Creates memory, auto-categorizes, auto-links, enforces 10KB content limit
- `searchMemories()` - FTS5 search with relevance scoring (keyword 30%, decay 25%, priority 10%, recency/category/link/tag boosts)
- `accessMemory()` - Reinforcement with diminishing returns, Hebbian link strengthening
- `detectRelationships()` - Tag-based + FTS content similarity (Jaccard ≥ 0.3)
- Anti-bloat: Truncates content >10KB, triggers async cleanup when limits exceeded

**`src/memory/consolidate.ts`** - Sleep-like consolidation
- `consolidate()` - Promotes high-salience STM to LTM, deletes decayed memories, updates scores
- `enforceMemoryLimits()` - Removes lowest-priority when 100 STM / 1000 LTM exceeded
- `mergeSimilarMemories()` - Clusters similar STM by Jaccard similarity ≥ 0.25, merges into LTM (pre-tokenized for performance)
- `evolveSalience()` - Boosts hub memories (highly linked) during consolidation
- Auto-runs every 4 hours (server.ts:581) + on startup (server.ts:568)

**`src/memory/decay.ts`** - Temporal decay calculations
- Exponential decay per hour (0.995 decay rate)
- LTM decays slower than STM (daily vs hourly half-life)
- Access count slows decay (up to 30%)
- Category-specific deletion thresholds (architecture: 0.15, note/todo: 0.25)

**`src/memory/salience.ts`** - Automatic importance detection
- Analyzes content for: explicit requests, architecture keywords, error patterns, code references, emotional markers
- Base salience 0.25, boosted by factors (0.0-1.0 scale)
- Auto-suggests category from content patterns
- Extracts tags from content (hashtags, identifiers)

**`src/database/init.ts`** - SQLite management
- WAL mode with `busy_timeout = 10000` for race condition mitigation
- Auto-checkpoint every 100 pages (~400KB) to prevent WAL bloat
- 100MB hard database size limit (blocks operations), 50MB warning threshold
- Legacy path fallback: `~/.claude-memory/` → `~/.claude-cortex/`
- Four tables: `memories`, `memories_fts` (FTS5 virtual table), `sessions`, `memory_links`, plus `metadata` key-value table
- Migrations handle adding `decayed_score`, `scope`, `transferable` columns (and legacy embedding columns for compatibility)

**`src/context/project-context.ts`** - Project auto-detection
- Detects project from `process.cwd()` path
- Global scope marker: `"*"`
- Queries auto-filter by project unless scope='global' or includeGlobal=true

### Search & Relevance Scoring

**FTS5 Query Escaping** (`store.ts:69-89`)
- Quotes boolean operators (AND, OR, NOT) to search literally
- Escapes special chars: `-:*^()&|.` and quotes
- Critical for preventing FTS5 syntax errors

**Relevance Calculation** (`store.ts:638-667`)
- FTS BM25 score: 30%
- Decayed score: 25%
- Priority: 10%
- Recency boost: 0-10% (if accessed <1hr: 10%, <24hr: 5%)
- Category match: 0-10%
- Link boost: 0-15% (from linked memory salience)
- Tag match: 0-10%

**Auto-reinforcement:**
- Top 5 search results get salience boost (store.ts:678-681)
- Co-returned results auto-link as 'related' (store.ts:684-707)
- Top result enriched with search query context if ≥30 new words (store.ts:710-721)

### Memory Relationships

**Link Types:** `references`, `extends`, `contradicts`, `related`

**Auto-linking on creation** (`store.ts:187-195`)
- Top 3 most relevant memories auto-linked
- Detection via tag overlap + FTS content similarity

**Hebbian Strengthening** (`store.ts:318-342`)
- Memories accessed within 5 minutes of each other
- Existing links +0.05 strength (max 1.0)
- New links created at 0.2 strength as 'related'

### Anti-Bloat Safeguards

1. **Content limit:** 10KB per memory with truncation warning (store.ts:32-52)
2. **Database limit:** 100MB hard limit, 50MB warning (init.ts:18-20)
3. **Memory caps:** 100 STM / 1000 LTM enforced (consolidate.ts:130-175)
4. **Auto-consolidation:** Every 4 hours + startup (server.ts:581)
5. **WAL autocheckpoint:** Every 100 pages to prevent WAL bloat (init.ts:80)
6. **Vacuum:** After deletions during cleanup (consolidate.ts:507-515)

## MCP Tool Workflow

The 15 tools are defined in `src/server.ts` and implemented in `src/tools/*.ts`:

**Primary tools:**
- `remember` - Store a memory (auto-categorizes, auto-links)
- `recall` - Search memories (query-based, recent, or important modes)
- `get_context` - THE KEY TOOL for session start / context restoration
- `forget` - Delete memories (supports dry-run preview)

**Session management:**
- `start_session` - Begin session, returns context
- `end_session` - Triggers consolidation

**Maintenance:**
- `consolidate` - Manual consolidation (supports dry-run)
- `memory_stats` - Statistics by type/category

**Advanced:**
- `get_related` - View memory relationships
- `link_memories` - Manual relationship creation
- `export_memories` / `import_memories` - Backup/restore
- `get_project` / `set_project` - Project scope management

## Important Implementation Details

### Project Scoping
- Memories auto-scoped to current working directory project name
- Global memories (`scope='global'`) appear in all project queries (unless `includeGlobal=false`)
- Use `"*"` sentinel for global/cross-project operations

### Salience vs Decayed Score
- `salience` - Initial/boosted importance (0.0-1.0)
- `decayedScore` - Current score after temporal decay
- Decayed score recalculated on-the-fly, persisted during consolidation
- Deletion threshold varies by category (see `types.ts:122-133`)

### Concurrent Access
- WAL mode prevents most lock conflicts
- `busy_timeout = 10000` (10 seconds) for race condition mitigation
- Transactions used for multi-step operations (consolidation, merging)
- Lock file written at startup (advisory only)

### Performance Optimizations
- FTS5 full-text index on title/content/tags
- Indexes on: type, project, category, salience, decayed_score, last_accessed
- Top search results reinforced (reduces future query latency)
- WAL checkpoint prevents unbounded growth
- `getMemoryStats()` uses single `GROUP BY type` query instead of 4 separate `COUNT(*)` queries
- `mergeSimilarMemories()` pre-tokenizes all texts before the O(n²) comparison loop via `jaccardFromSets()`
- Tech terms regex in `similarity.ts` hoisted to module-level constant (avoids per-call recompilation)
- Startup consolidation skipped if it ran within the last hour (tracked in `metadata` table)

## Common Patterns

**Adding a new category:** Update `MemoryCategory` type in `src/memory/types.ts` and `DELETION_THRESHOLDS` map.

**Adjusting decay behavior:** Modify `DEFAULT_CONFIG` in `types.ts` (decayRate, salienceThreshold, consolidationThreshold).

**Custom relationship detection:** Extend `detectRelationships()` in `store.ts` with new heuristics.

**New MCP tool:** Add to `src/server.ts` tools section (88-459), implement handler in `src/tools/*.ts`, follow existing schema patterns with Zod validation.

## Testing Considerations

When testing:
- Use `--db` flag to isolate test database
- Remember consolidation runs on startup (may affect initial state)
- Decay scores change over time (use fixed timestamps in tests)
- FTS5 tokenization is porter-stemmed (searches match stems, not exact words)
- Memory limits enforced asynchronously (may not trigger immediately)

## Troubleshooting

### FTS5 Syntax Errors

**Symptom:** `Failed to remember: Error: fts5: syntax error near "X"`

**Cause:** Memory titles or queries contain FTS5 special characters that aren't properly escaped.

**Fixed in version 2.0.0:** The `escapeFts5Query` function now escapes these characters: `- : * ^ ( ) & | . / , { } +`

**Workaround (if using older version):** Avoid these characters in memory titles, or quote the entire title manually.

### Pre-Compact Hook Failures

**Symptom:** Hook returns "Invalid hook input structure" with 0 memories extracted

**Cause:** Claude Code is not passing the expected conversation data structure to the hook.

**Debug Steps:**
1. Check stderr when running `/compact` - debug logs will show what fields are missing
2. Verify hook input has: `type`, `context.project`, `context.workingDirectory`, `context.timestamp`, `context.conversationHistory`
3. File issue with Claude Code if input structure doesn't match `HookInput` interface

**Workaround:** Manually use `mcp__memory__remember` to store important facts instead of relying on automatic extraction.

### Database Lock Errors

**Symptom:** `SQLITE_BUSY: database is locked`

**Cause:** Multiple processes accessing the database simultaneously, or WAL checkpoint in progress.

**Solution:**
- WAL mode has 10-second `busy_timeout` to handle transient locks
- If persistent, check for orphaned processes: `ps aux | grep claude-cortex`
- Remove lock file if no processes running: `rm ~/.claude-cortex/memories.db-lock`

### Memory Not Found After Storage

**Symptom:** Stored memory doesn't appear in recall results

**Possible Causes:**
1. **Project scoping:** Memory stored in different project scope - try `includeGlobal: true`
2. **FTS5 tokenization:** Search uses porter stemming - try broader keywords
3. **Low salience:** Memory decayed quickly - check with `memory_stats` tool
4. **Database size limit:** Database may be blocked (>100MB) - check size with `du -h ~/.claude-cortex/memories.db`
