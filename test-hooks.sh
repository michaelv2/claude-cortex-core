#!/bin/bash
# Simple integration test for hooks

echo "Testing PreCompact Hook..."
echo '{
  "type": "preCompact",
  "context": {
    "project": "test-project",
    "workingDirectory": "/tmp/test",
    "timestamp": "2026-01-29T12:00:00Z",
    "conversationHistory": [
      {
        "role": "user",
        "content": "We decided to use PostgreSQL for the database because it has better ACID guarantees."
      },
      {
        "role": "assistant",
        "content": "That is an architecture decision. PostgreSQL is a good choice for projects requiring strong consistency."
      },
      {
        "role": "user",
        "content": "The bug was fixed by adding a null check in the validation function."
      }
    ]
  }
}' | node dist/bin/pre-compact.js

echo ""
echo "Testing SessionStart Hook..."
echo '{
  "type": "sessionStart",
  "context": {
    "project": "test-project",
    "workingDirectory": "/tmp/test",
    "timestamp": "2026-01-29T12:00:00Z"
  }
}' | node dist/bin/session-start.js

echo ""
echo "Hook tests completed!"
