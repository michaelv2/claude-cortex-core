# Upstream Security Review - 2025-01-30

## Commit: 16ea0ea - Security Audit Fixes

**Upstream commit:** `fix: security audit — command injection, SQL param, data corruption`

### Files Changed:
1. `hooks/clawdbot/cortex-memory/handler.js` - ❌ Not applicable (Clawdbot not in core)
2. `scripts/pre-compact-hook.mjs` - ❌ Not applicable (we use src/bin/pre-compact.ts)
3. `scripts/session-start-hook.mjs` - ❌ Not applicable (we use src/bin/session-start.ts)
4. `src/api/visualization-server.ts` - ❌ Not applicable (API server removed)
5. `package.json` - ✅ Consider adopting

### Security Fixes Analysis:

#### 1. Command Injection (Clawdbot) - NOT APPLICABLE
- **Fix:** Removed `shell:true` from `execFile`
- **Impact:** N/A - Clawdbot not in core

#### 2. Data Corruption (SQL escaping) - REVIEWED ✓
- **Fix:** Escape single quotes instead of stripping them
- **Our code:** Reviewed `src/memory/store.ts` and `src/bin/*.ts`
- **Status:** Our code uses proper SQL parameterization via better-sqlite3's prepared statements. No raw SQL string concatenation found.

#### 3. SQL Injection (NOT IN clause) - NOT APPLICABLE
- **Fix:** Parameterize SQL NOT IN clause in session-start hook
- **Our code:** `src/bin/session-start.ts` doesn't use NOT IN clauses

#### 4. SQL Injection Bypass (DROP/TRUNCATE) - NOT APPLICABLE
- **Fix:** Use word-boundary regex `\bDROP\b` instead of `.includes('DROP')`
- **Our code:** No SQL endpoint (API server removed)

#### 5. Session JSONL Reader - NOT APPLICABLE
- **Fix:** Add session JSONL reader for auto-extraction
- **Our code:** Different hook implementation using Claude Code's stdin data

### Recommendation:

**DO NOT cherry-pick this commit.** All security fixes are in components we don't have:
- Clawdbot integration
- API server
- Their hook implementation (we maintain our own)

Our codebase:
- ✅ Uses prepared statements (no SQL injection risk)
- ✅ No shell execution
- ✅ Different hook architecture

### Action Item: Package.json Enhancement

Consider adding from their package.json:
```json
"prepublishOnly": "npm run build"
```

This ensures built files are up-to-date before npm publish.

---

## Next Review: 2025-02-28
