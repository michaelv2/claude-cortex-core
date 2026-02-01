# Fork Maintenance Guide

This is a minimal fork of [claude-cortex](https://github.com/mkdelta221/claude-cortex) that removes non-essential features while preserving the core memory pipeline.

## What We Removed

- **Dashboard** - 3D brain visualization UI
- **Embeddings** - Semantic vector search (@xenova/transformers, @huggingface/transformers)
- **API Server** - HTTP API for external access
- **Setup Command** - Automatic hook installer (we maintain standalone hooks)

## What We Keep In Sync

### Core Modules (MUST sync)
- `src/memory/` - Memory CRUD, consolidation, decay, salience
- `src/database/` - SQLite operations, migrations, initialization
- `src/context/` - Project detection and scoping
- `src/server.ts` - MCP tool registration
- `src/tools/` - MCP tool implementations
- `src/errors.ts` - Error handling

### What to Cherry-pick
- ✅ Bug fixes in core modules
- ✅ Security patches
- ✅ Performance improvements
- ✅ Database schema fixes
- ✅ FTS5 query improvements
- ✅ Memory algorithm enhancements

### What to Ignore
- ❌ Dashboard features
- ❌ Embedding/vector search
- ❌ API server changes
- ❌ Setup command changes
- ❌ Dependencies: `@xenova/transformers`, `@huggingface/transformers`, `express`, `ws`

## Upstream Remote

```bash
git remote -v
# upstream  https://github.com/mkdelta221/claude-cortex.git (fetch)
```

## Monthly Sync Workflow

### 1. Fetch Latest Changes
```bash
git fetch upstream
```

### 2. Review Recent Commits
```bash
# Last month of changes
git log upstream/main --oneline --since="1 month ago"

# Detailed view with files changed
git log upstream/main --since="1 month ago" --stat
```

### 3. Identify Relevant Commits

Focus on commits touching core modules:
```bash
# Check specific file changes
git log upstream/main --since="1 month ago" -- src/memory/
git log upstream/main --since="1 month ago" -- src/database/
git log upstream/main --since="1 month ago" -- src/server.ts
```

Look for keywords: `fix:`, `security`, `perf:`, `bug`, `SQL`, `consolidate`, `decay`, `salience`

### 4. Review Commit Details

Before cherry-picking, examine the full diff:
```bash
git show <commit-hash>
```

Check if it touches removed features:
```bash
git show <commit-hash> --stat | grep -E "dashboard|embedding|api"
```

### 5. Cherry-pick Relevant Commits

```bash
# Cherry-pick a single commit
git cherry-pick <commit-hash>

# If conflicts occur
git status  # See what's conflicting
# Manually resolve conflicts in your editor
git add <resolved-files>
git cherry-pick --continue

# Skip if not relevant after all
git cherry-pick --abort
```

### 6. Test After Cherry-picking

```bash
npm run build
npm start  # Verify server starts
# Test with Claude Code to ensure memory operations work
```

### 7. Document What You Synced

Update this file's "Sync History" section below.

## Quick Commands

```bash
# Fetch and show new commits
git fetch upstream && git log HEAD..upstream/main --oneline

# Show commits touching core files
git log upstream/main --since="1 month ago" --oneline -- src/memory/ src/database/ src/server.ts src/tools/

# Preview a cherry-pick (dry run)
git show <commit-hash>

# Cherry-pick with sign-off
git cherry-pick -x <commit-hash>  # Adds "(cherry picked from commit ...)" to message
```

## Sync History

### 2025-01-30 - Initial Fork Setup
- Added upstream remote: `https://github.com/mkdelta221/claude-cortex.git`
- Diverged from upstream at commit: `4f40920`
- Current upstream version: `v1.8.3`
- **Reviewed commit 16ea0ea (security fixes):** Not applicable - all fixes in removed components
- **Applied:** Added `prepublishOnly` script to package.json (ensures build before npm publish)

### Next Sync Due: 2026-02-28

---

## Notes

- **Security fixes are critical** - Always cherry-pick immediately
- **Test thoroughly** - Memory corruption bugs are hard to detect
- **Keep it minimal** - Resist feature creep from upstream
- **Document decisions** - Update this file when you choose NOT to sync something important
