# Claude Cortex Core

**Claude Cortex Core** is a minimal, production-ready MCP (Model Context Protocol) server that gives Claude Code persistent brain-like memory. It's a stripped-down fork of [`claude-cortex`](https://github.com/mkdelta221/claude-cortex) that removes all non-essential subsystems while preserving the complete remember/recall/forget/consolidate pipeline.

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
- ✅ Hook scripts (SessionStart, PreCompact) - **Now re-added as optional feature**

The original **claude-cortex** had two hooks that provided automatic saving. These have been re-implemented in **claude-cortex-core** as standalone executables that maintain the minimal philosophy.

These are **completely optional** and can be enabled by configuring Claude Code hooks. See the "Automated Memory Hooks" section below for setup instructions.

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
# Clone or download the repository
git clone https://github.com/michaelv2/claude-cortex-core.git
cd claude-cortex-core

# Install dependencies
npm install

# Build the project
npm run build

# Add MCP server to Claude Code (use absolute path)
claude mcp add memory node $(pwd)/dist/index.js

# Verify it's connected
claude mcp list
# Should show: memory: ... - ✓ Connected
```

**Important**: Use the `claude mcp add` command rather than manually editing config files. Claude Code stores MCP servers in `~/.claude.json` and the CLI command ensures proper registration.

## Automated Memory Hooks (Optional)

Claude Cortex Core now includes **optional automated memory hooks** that were inspired by the original claude-cortex. These hooks can automatically extract and restore memories without manual tool calls.

### Available Hooks

#### 1. PreCompact Hook
Automatically extracts memories before context compaction:
- Scans conversation for high-salience content
- Auto-extracts decisions, fixes, learnings, patterns
- Saves up to 5 memories per compaction
- Tags with "auto-extracted"

#### 2. SessionStart Hook
Automatically restores context at session start:
- Loads project-specific context
- Shows architecture decisions, patterns, preferences
- Displays up to 15 high-salience memories

### Setup

1. **Build the project** (hooks are compiled with the main server):
```bash
npm run build
```

2. **Add the MCP server** (if not already done):
```bash
claude mcp add memory node $(pwd)/dist/index.js
```

3. **Configure hooks in Claude Code** by editing `~/.claude/settings.json`:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/claude-cortex-core/dist/bin/session-start.js"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/claude-cortex-core/dist/bin/pre-compact.js"
          }
        ]
      }
    ]
  }
}
```

**Note**: Replace `/path/to/claude-cortex-core` with your actual installation path. The MCP server should be added using `claude mcp add` (step 2), not manually in settings.json.

3. **Optional: Customize hook behavior** (`~/.claude-cortex/hooks.json`):
```json
{
  "preCompact": {
    "enabled": true,
    "minSalience": 0.30,
    "maxMemoriesPerCompact": 5,
    "categories": ["architecture", "pattern", "error", "learning"],
    "autoTag": "auto-extracted",
    "timeout": 5000
  },
  "sessionStart": {
    "enabled": true,
    "maxMemories": 15,
    "minSalience": 0.5,
    "categories": ["architecture", "pattern", "preference"],
    "format": "summary",
    "timeout": 3000
  }
}
```

Copy `hooks.json.example` to `~/.claude-cortex/hooks.json` as a starting point.

### Hook Configuration Options

**PreCompact Hook**:
- `enabled` - Enable/disable the hook (default: true)
- `minSalience` - Minimum importance threshold (default: 0.30)
- `maxMemoriesPerCompact` - Max memories to save per compaction (default: 5)
- `categories` - Which categories to auto-extract (default: architecture, pattern, error, learning)
- `autoTag` - Tag added to auto-extracted memories (default: "auto-extracted")
- `timeout` - Max processing time in ms (default: 5000)

**SessionStart Hook**:
- `enabled` - Enable/disable the hook (default: true)
- `maxMemories` - Max context items to load (default: 15)
- `minSalience` - Minimum importance threshold (default: 0.5)
- `categories` - Which categories to include (default: architecture, pattern, preference)
- `format` - Output format: "summary", "detailed", or "minimal" (default: "summary")
- `timeout` - Max processing time in ms (default: 3000)

### Benefits & Trade-offs

**Benefits**:
- Automatic memory saving without manual `remember()` calls
- Context automatically restored at session start
- Configurable behavior per project
- Fail-safe: Hook failures never break Claude Code

**Trade-offs**:
- Pattern matching may extract false positives
- Adds 1-3s latency to compaction
- Requires Claude Code hooks support
- Less control vs manual saving

### Disabling Hooks

To disable without removing from Claude Code config, set `enabled: false` in `~/.claude-cortex/hooks.json`:

```json
{
  "preCompact": { "enabled": false },
  "sessionStart": { "enabled": false }
}
```

Or remove the `hooks` section from `~/.claude/settings.json` entirely.

## Troubleshooting

### MCP Server Not Connecting

If you see "No MCP servers configured" after setup:

1. **Verify the server was added correctly**:
```bash
claude mcp list
# Should show: memory: ... - ✓ Connected
```

2. **If not listed, add it using the CLI** (don't edit config files manually):
```bash
cd /path/to/claude-cortex-core
claude mcp add memory node $(pwd)/dist/index.js
```

3. **Check server health**:
```bash
claude mcp get memory
# Should show: Status: ✓ Connected
```

4. **Test server manually**:
```bash
cd /path/to/claude-cortex-core
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js
# Should return JSON response with server info
```

5. **Rebuild if needed**:
```bash
npm run build
claude mcp remove memory
claude mcp add memory node $(pwd)/dist/index.js
```

### Common Issues

- **"No MCP server found"**: Use `claude mcp add` instead of manually editing config files
- **Server not in list**: MCP servers are stored in `~/.claude.json` (project-specific) or global config, not `~/.claude/settings.json`
- **Build errors**: Ensure you have Node.js ≥18.0.0 and ran `npm install`
- **Permission denied**: Make sure `dist/index.js` is readable (`chmod +r dist/index.js`)

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
# → "claude-cortex-core" (detected from /path/to/claude-cortex-core)

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
- **Short-term** (STM) - Recent, working memories (max 250)
- **Long-term** (LTM) - Consolidated, important memories (max 5000)
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
3. Enforces memory limits (250 STM, 5000 LTM)
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
- 250 STM / 5000 LTM enforced limits

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
