# Changelog

All notable changes to claude-cortex-core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Reverted
- **OpenAI embeddings layer** - Removed the semantic search / OpenAI embedding integration, restoring the original FTS5-only design. Deleted `src/memory/embeddings.ts`, removed `openai` dependency, stripped all embedding types and vector search params. Back to 3 production dependencies, 15 MCP tools, zero network connections.

### Added
- **Pre-compact dedup check** - Before storing each auto-extracted memory, searches existing memories and skips near-duplicates (relevance score > 0.8). Prevents double-storage from manual `remember()` calls overlapping with auto-extraction.
- **Startup consolidation skip** - Tracks last consolidation time in a `metadata` table. Skips startup consolidation if it ran within the last hour, reducing cold-start latency.
- **`jaccardFromSets()` in similarity.ts** - Accepts pre-tokenized sets for use in hot loops, avoiding redundant tokenization.
- **Troubleshooting section in CLAUDE.md** - Diagnostics for FTS5 syntax errors, pre-compact hook failures, database locks, and missing memories.
- **Debug logging for pre-compact hook** - Shows exactly what fields are present/missing when hook validation fails.

### Fixed
- **Critical: FTS5 escaping bug** - Fixed FTS5 query escaping to handle slash (`/`), comma (`,`), braces (`{}`), and plus (`+`) characters. The `escapeFts5Query` function now properly quotes all FTS5 special characters.

### Performance
- **`getMemoryStats()`** - Replaced 4 separate `COUNT(*)` queries with a single `GROUP BY type` query.
- **`mergeSimilarMemories()`** - Pre-tokenizes all texts before O(n²) comparison loop via `jaccardFromSets()`.
- **Removed redundant statement cache** - Deleted `statementCache` WeakMap; `better-sqlite3` caches prepared statements internally.
- **Hoisted `TECH_TERMS_RE` regex** - Moved to module-level constant in `similarity.ts` to avoid per-call recompilation.

### Removed
- `docs/` directory - Deleted stale semantic search implementation docs and one-time investigation reports. Findings captured in CLAUDE.md troubleshooting section.
- `HOOKS.md` - Content duplicated in README.md "Automated Memory Hooks" section.

## [2.0.0] - 2026-01-30

Initial release of claude-cortex-core as a minimalist fork of claude-cortex.

### Added
- Minimal MCP server with 15 tools for memory operations
- Brain-like memory architecture (STM, LTM, episodic)
- FTS5 full-text search (no semantic embeddings)
- Temporal decay and salience scoring
- Automatic consolidation (STM → LTM promotion)
- Project-scoped memories with global scope support
- Session start and pre-compact hooks for Claude Code integration
- SQLite with WAL mode at ~/.claude-cortex/memories.db
- 3 production dependencies only (MCP SDK, better-sqlite3, zod)
- Zero network connections

### Removed (from upstream claude-cortex)
- Dashboard and web UI
- Semantic search and embeddings
- API server
- All non-essential dependencies

[Unreleased]: https://github.com/yourusername/claude-cortex-core/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/yourusername/claude-cortex-core/releases/tag/v2.0.0
