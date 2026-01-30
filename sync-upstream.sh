#!/bin/bash
# Upstream Sync Helper for claude-cortex-core
# Usage: ./sync-upstream.sh [review|check-commit <hash>]

set -e

UPSTREAM="upstream"
UPSTREAM_BRANCH="main"
CORE_PATHS="src/memory/ src/database/ src/context/ src/server.ts src/tools/ src/errors.ts"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Claude Cortex Core - Upstream Sync Helper ===${NC}\n"

# Fetch latest
echo -e "${GREEN}Fetching from upstream...${NC}"
git fetch "$UPSTREAM"

if [ "$1" == "review" ]; then
    # Full review mode
    echo -e "\n${YELLOW}=== Commits Since Last Sync (30 days) ===${NC}\n"
    git log "$UPSTREAM/$UPSTREAM_BRANCH" --oneline --since="30 days ago"

    echo -e "\n${YELLOW}=== Commits Touching Core Modules ===${NC}\n"
    git log "$UPSTREAM/$UPSTREAM_BRANCH" --oneline --since="30 days ago" -- $CORE_PATHS

    echo -e "\n${YELLOW}=== Security & Bug Fixes ===${NC}\n"
    git log "$UPSTREAM/$UPSTREAM_BRANCH" --oneline --since="30 days ago" --grep="fix:\|security\|bug"

    echo -e "\n${GREEN}To review a specific commit:${NC} ./sync-upstream.sh check-commit <hash>"

elif [ "$1" == "check-commit" ]; then
    # Check specific commit
    if [ -z "$2" ]; then
        echo -e "${RED}Error: Please provide a commit hash${NC}"
        echo "Usage: ./sync-upstream.sh check-commit <hash>"
        exit 1
    fi

    COMMIT_HASH="$2"
    echo -e "${YELLOW}=== Commit Details: $COMMIT_HASH ===${NC}\n"
    git show "$COMMIT_HASH" --stat

    echo -e "\n${YELLOW}=== Checking for Removed Features ===${NC}"
    if git show "$COMMIT_HASH" --stat | grep -qE "dashboard|embedding|api-server|setup"; then
        echo -e "${RED}⚠️  WARNING: This commit touches removed features${NC}"
        echo -e "Review carefully before cherry-picking"
    else
        echo -e "${GREEN}✓ No removed features detected${NC}"
    fi

    echo -e "\n${GREEN}To cherry-pick:${NC} git cherry-pick -x $COMMIT_HASH"

else
    # Quick summary
    echo -e "${YELLOW}Recent upstream activity (7 days):${NC}"
    git log "$UPSTREAM/$UPSTREAM_BRANCH" --oneline --since="7 days ago" | head -10

    echo -e "\n${GREEN}Available commands:${NC}"
    echo "  ./sync-upstream.sh review          - Full review of last 30 days"
    echo "  ./sync-upstream.sh check-commit <hash> - Detailed commit analysis"
    echo ""
    echo -e "${YELLOW}Manual commands:${NC}"
    echo "  git log $UPSTREAM/$UPSTREAM_BRANCH --oneline --since='1 month ago'"
    echo "  git show <commit-hash>"
    echo "  git cherry-pick -x <commit-hash>"
fi
