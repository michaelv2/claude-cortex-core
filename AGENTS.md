# Repository Guidelines

## Project Structure & Module Organization

- `src/` contains the TypeScript source. Key areas: `src/server.ts` (MCP server wiring), `src/memory/` (memory pipeline), `src/database/` (SQLite layer), `src/tools/` (MCP tools), `src/bin/` (hook executables).
- `dist/` is generated build output (committed artifacts are excluded; rebuild locally).
- Root scripts and docs live alongside config files: `package.json`, `tsconfig.json`, `hooks.json.example`, `README.md`.

## Build, Test, and Development Commands

- `npm run build` compiles TypeScript to `dist/` with `tsc`.
- `npm run dev` runs the MCP server directly from `src/` using `tsx`.
- `npm start` runs the compiled server from `dist/`.
- `./test-hooks.sh` runs a lightweight integration smoke test for hook executables (requires `npm run build` first).

## Coding Style & Naming Conventions

- TypeScript, ESM (`"type": "module"`). Use 2-space indentation and semicolons, matching existing files in `src/`.
- Prefer explicit types on public interfaces and exported functions.
- Filenames use kebab-case in `src/bin/` (e.g., `pre-compact.ts`) and lowerCamelCase in code identifiers.
- No formatter or linter is configured; keep changes consistent with nearby code.

## Testing Guidelines

- There is no automated unit test framework in this repo.
- Validate changes with `npm run build` and, when touching hooks, run `./test-hooks.sh`.
- Keep the hook JSON fixtures in `test-hooks.sh` up to date if the hook contract changes.

## Commit & Pull Request Guidelines

- Recent commits use short, imperative, sentence-case messages (e.g., “Update README with correct MCP server setup instructions”). Follow that pattern.
- PRs should include: a short summary, a list of behavior changes, and the commands you ran (e.g., `npm run build`).
- If you change hook behavior or config, update `README.md` and `hooks.json.example`.

## Configuration Notes

- Hook settings live at `~/.claude-cortex/hooks.json` (see `hooks.json.example` for defaults).
- The MCP server is expected to be registered via `claude mcp add memory node /abs/path/to/dist/index.js`.
