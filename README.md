# Claude Cortex Core - Overview

## What It Is

**Claude Cortex Core** is a minimal, production-ready MCP (Model Context Protocol) server that gives Claude Code persistent brain-like memory. It's a stripped-down fork of `claude-cortex` that removes all non-essential subsystems while preserving the complete remember/recall/forget/consolidate pipeline.

## Key Stats

- **Dependencies**: 3 production deps (down from 7)
  - `@modelcontextprotocol/sdk` - MCP protocol
  - `better-sqlite3` - Database
  - `zod` - Schema validation
- **Size**: 75MB node_modules (down from ~150MB+)
- **Code**: 4,748 lines across 15 source files
- **Attack Surface**: Zero network connections, no HTTP server, no external model downloads
- **Tools**: 15 MCP tools for memory operations

## What Was Removed

- ❌ Dashboard (Next.js + Three.js 3D brain visualization)
- ❌ API server (Express + WebSocket)
- ❌ Embeddings (@huggingface/transformers semantic search)
- ❌ Spreading activation (ephemeral session state)
- ❌ Contradiction detection (active analysis)
- ❌ Brain worker (background tick processing)
- ❌ Service installer (auto-start system)
- ❌ Hook scripts (SessionStart, PreCompact)

The original **claude-cortex** had two hooks that provided automatic saving:

1. **PreCompact Hook** - Before every context compaction (manual or auto), it would:
  - Scan the conversation for high-salience content
  - Auto-extract decisions, fixes, learnings, patterns
  - Save up to 5 memories per compaction (threshold: salience ≥ 0.25-0.35)
  - Tag them with "auto-extracted"
2. **SessionStart Hook** - At every new session:
  - Auto-load project context from memory
  - Show architecture decisions, patterns, preferences
  - Display up to 15 high-salience memories

These were removed from **claude-cortex-core** because:
- They added complexity (hook scripts, setup command)
- They required Claude Code integration (hooks in ~/.claude/settings.json)
- The goal was minimal, library-like simplicity

## What Stays

- ✅ **Complete Memory Pipeline**
- ✅ FTS5 full-text search (SQLite built-in)
- ✅ Temporal decay with reinforcement
- ✅ Automatic salience detection
- ✅ STM → LTM consolidation
- ✅ Project auto-scoping
- ✅ Memory relationships (links)
- ✅ Enrichment (context accumulation)
- ✅ Hebbian learning (co-access strengthening)

## Intended workflow

Proactive Manual Saving:
- After making a decision → remember({ title: "...", content: "..." })
- After fixing a bug → remember({ title: "...", content: "..." })
- After learning something → remember({ title: "...", content: "..." })
- At session start → get_context() to restore context

The trade-off is: more control, less magic. You decide what's worth remembering,
rather than relying on automatic heuristics.

## Installation & Setup

```bash
# Navigate to the new project
cd ~/projects/claude-cortex-core

# Install dependencies
npm install

# Build
npm run build

# Add to Claude Code MCP config
# Edit ~/.claude/settings.json and add:
```

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["/home/maqo/projects/claude-cortex-core/dist/index.js"],
      "env": {}
    }
  }
}
```

## Usage Examples

### Basic Memory Operations

```bash
# Store a memory
remember({
  title: "Authentication uses JWT tokens",
  content: "The auth system uses JWT tokens with 24h expiry. Refresh tokens stored in httpOnly cookies.",
  category: "architecture",
  importance: "high"
})

# Search memories
recall({
  query: "authentication",
  limit: 5
})

# Get context at session start
get_context({
  query: "What was I working on?"
})

# Delete old memories
forget({
  olderThan: 30,  // days
  dryRun: true    // preview first
})

# Run consolidation (like brain sleep)
consolidate({
  dryRun: false
})

# View statistics
memory_stats()
```

### Project Scoping

Memories are automatically scoped to the project detected from `process.cwd()`:

```bash
# Current project
get_project()
# → "claude-cortex-core" (detected from /home/maqo/projects/claude-cortex-core)

# Switch to global scope
set_project({ project: "*" })

# Recall across all projects
recall({
  query: "typescript patterns",
  project: "*"
})
```

### Advanced Features

**Memory Links** - Automatically detected relationships:
```bash
# View related memories
get_related({ id: 42 })

# Manually create a link
link_memories({
  sourceId: 42,
  targetId: 87,
  relationship: "references",
  strength: 0.8
})
```

**Sessions** - Track work periods:
```bash
start_session({ project: "my-app" })
# → Returns session ID + context summary

# ... do work, create memories ...

end_session({
  sessionId: 123,
  summary: "Implemented user authentication"
})
# → Triggers consolidation
```

**Export/Import** - Backup or transfer:
```bash
# Export
export_memories({ project: "my-app" })
# → Returns JSON

# Import
import_memories({ data: "[...]" })
```

## How It Works

### Memory Types
- **Short-term** (STM) - Recent, working memories (max 100)
- **Long-term** (LTM) - Consolidated, important memories (max 1000)
- **Episodic** - Session markers and timestamps

### Categories
`architecture`, `pattern`, `preference`, `error`, `context`, `learning`, `todo`, `note`, `relationship`, `custom`

### Salience (Importance)
- Auto-calculated from content (0.0 - 1.0)
- Based on: explicit requests, architecture keywords, error patterns, code references, emotional markers
- Reinforced on access with diminishing returns

### Temporal Decay
- Memories fade over time (exponential decay)
- LTM decays slower than STM (daily vs hourly)
- Access count slows decay (up to 30% slower)
- Category-specific deletion thresholds (architecture harder to delete)

### Consolidation
Runs automatically every 4 hours + on server startup:
1. Promotes high-salience STM → LTM
2. Deletes decayed memories below threshold
3. Enforces memory limits (100 STM, 1000 LTM)
4. Updates decay scores
5. Boosts hub memories (highly linked)

### Search
FTS5 full-text search with relevance scoring:
- Keyword match (30%)
- Decay score (25%)
- Priority score (10%)
- Recency boost (0-10%)
- Category match (0-10%)
- Link boost (0-15%)
- Tag match (0-10%)

Top 5 results are automatically reinforced.

## Database Location

`~/.claude-cortex/memories.db` (SQLite with WAL mode)

Legacy path `~/.claude-memory/` still works for backward compatibility.

### Tables
- `memories` - Core memory storage
- `memories_fts` - Full-text search index (FTS5)
- `sessions` - Session tracking
- `memory_links` - Relationships between memories

## Anti-Bloat Safeguards

- 10KB per-memory content limit (with truncation warning)
- 100MB database hard limit
- Auto-consolidation every 4 hours
- Auto-vacuum after deletions
- 100 STM / 1000 LTM enforced limits

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build

# Custom database path
node dist/index.js --db /path/to/custom.db
```

## Key Differences from Original

| Feature | claude-cortex | claude-cortex-core |
|---------|---------------|-------------------|
| Dependencies | 7 prod | **3 prod** |
| node_modules | ~150MB+ | **75MB** |
| Network | HTTP/WS server | **None** |
| Embeddings | Yes (100MB+) | **No** (FTS5 only) |
| Dashboard | 3D visualization | **None** |
| Attack surface | High | **Minimal** |
| Startup time | ~3-5s | **<1s** |
| Complexity | High | **Low** |

## When to Use Which

**Use claude-cortex-core if:**
- You want minimal dependencies
- You don't need a dashboard
- You trust FTS5 keyword search
- You want fast startup
- You're deploying in production

**Use claude-cortex if:**
- You want semantic search (embeddings)
- You want the 3D brain visualization
- You want the dashboard API
- You're exploring/experimenting

## Notes

- All 15 MCP tools work identically to the original
- Existing databases are compatible (unused columns ignored)
- Project auto-detection works the same way
- Memory format is unchanged
- No breaking changes to the MCP interface

The system is production-ready and optimized for speed, simplicity, and security.
