#!/bin/bash
# Backup claude-cortex SQLite database using atomic .backup via Python's sqlite3.
# Safe to run while the MCP server is writing — .backup is copy-on-write.
#
# Usage: backup-cortex.sh
# Cron:  0 * * * *  /home/maqo/.local/bin/backup-cortex.sh
#        (hourly, on the hour)

# Load env vars (SLACK_WEBHOOK_URL, etc.) — cron doesn't inherit shell env
if [ -f "$HOME/.bashrc_env" ]; then
    source "$HOME/.bashrc_env"
fi

CORTEX_DB="${CORTEX_DB:-$HOME/.claude-cortex/memories.db}"
HOOKS_JSON="${CORTEX_HOOKS:-$HOME/.claude-cortex/hooks.json}"
BACKUP_DIR="/mnt/s/backup/.claude-cortex"
BACKUP_RETENTION_DAYS="${CORTEX_BACKUP_RETENTION_DAYS:-7}"

# --- Alert helper ---
send_alert() {
    local message="$1"
    echo "$message" >&2
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local escaped
        escaped=$(echo "$message" | sed 's/"/\\"/g')
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔴 *Cortex backup failed* ($(hostname))\n${escaped}\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1
    fi
}

# --- Check NAS mount ---
if ! mountpoint -q /mnt/s 2>/dev/null; then
    send_alert "NAS not mounted at /mnt/s — backup skipped. Mount and re-run manually."
    exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M)
BACKUP_FILE="$BACKUP_DIR/cortex-$TIMESTAMP.db"

# Atomic backup via sqlite3 .backup (safe during concurrent writes)
python3 -c "
import sqlite3, sys
src = sqlite3.connect('$CORTEX_DB')
dst = sqlite3.connect('$BACKUP_FILE')
src.backup(dst)
dst.close()
src.close()
" 2>&1

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup complete: $BACKUP_FILE ($SIZE)"
else
    send_alert "sqlite3 backup command failed. Check DB path: $CORTEX_DB"
    exit 1
fi

# Copy hooks.json (small config file, simple cp is fine)
if [ -f "$HOOKS_JSON" ]; then
    cp "$HOOKS_JSON" "$BACKUP_DIR/hooks.json"
fi

# Prune old backups
DELETED=$(find "$BACKUP_DIR" -name "cortex-*.db" -mtime +$BACKUP_RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "Pruned $DELETED backups older than $BACKUP_RETENTION_DAYS days"
fi
