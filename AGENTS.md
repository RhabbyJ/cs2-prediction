# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Go matching engine and WebSocket server (`cmd/server/main.go`, `internal/engine/*`, `internal/audit/*`).
- `adapter/`: TypeScript market-data adapter/provider layer (GRID Open Access discovery + deterministic mock in-play stream).
- `frontend/`: Next.js app (`src/app/*`) with API routes for GRID and engine proxies.
- `scripts/`: utility scripts and Lua helpers.
- `docker-compose.yml`: local orchestration for `engine`, `adapter`, and `redis`.
- `codex/`: project memory/state/tasks for session continuity.

## Build, Test, and Development Commands
- Root services:
  - `docker compose up -d --build`: build and run engine/adapter/redis.
  - `docker compose logs -f engine` / `docker compose logs -f adapter`: inspect runtime behavior.
- Backend (`backend/`):
  - `go mod tidy`: sync module metadata.
  - `go build ./...`: compile all Go packages.
- Adapter (`adapter/`):
  - `npx tsc --noEmit`: type-check only.
  - `npx tsc`: build to `dist/`.
- Frontend (`frontend/`):
  - `npm install`
  - `npm run dev`: local Next.js server.
  - `npm run build`: production build.
  - `npm run lint`: ESLint checks.

## Coding Style & Naming Conventions
- Go: use `gofmt` before commit; exported names in `PascalCase`, internal helpers in `camelCase`.
- TypeScript/React: follow ESLint defaults; prefer explicit types for API payloads.
- Keep file names consistent with existing patterns (`seriesState.ts`, `market_registry.go`).
- Use clear event type strings (`market_created`, `series_state`, `circuit_breaker`).

## Testing Guidelines
- No full test suite is enforced yet; minimum gate is successful build/type-check.
- Validate core flows manually:
  - `curl http://localhost:8080/markets`
  - WebSocket stream at `/ws`
  - Frontend rendering of engine market feed.
- Add focused tests when introducing new engine logic or provider behavior.

## Commit & Pull Request Guidelines
- Commit messages: short, imperative, scoped (e.g., `backend: tune circuit breaker auto-recovery`).
- Keep commits atomic (backend, adapter, frontend changes grouped logically).
- PRs should include:
  - What changed and why
  - Verification steps/commands run
  - API/UI evidence (sample `curl` output or screenshots)

## Security & Configuration Tips
- Never commit real API keys. Use `.env` (`GRID_API_KEY`, `ENGINE_URL`, `NEXT_PUBLIC_ENGINE_URL`).
- Open Access key works with `https://api-op.grid.gg/central-data/graphql`; do not assume access to commercial endpoints.
