# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: Go engine, websocket server, market registry, dummy ledger.
- `adapter/`: TypeScript provider layer (GRID discovery + deterministic mock replay).
- `frontend/`: Next.js dashboard + API proxies (`/api/grid/*`, `/api/engine/*`).
- `codex/`: source-of-truth handoff docs (`memory.md`, `state.md`, `tasks.md`).

## Build, Test, and Development Commands
- Root runtime: `docker compose up -d --build`
- Logs: `docker compose logs -f engine`, `docker compose logs -f adapter`
- Backend: `cd backend && go mod tidy && go build ./...`
- Adapter: `cd adapter && npx tsc --noEmit`
- Frontend: `cd frontend && npm run dev` (or `npm run build`)

## Coding Style & Naming Conventions
- Go: `gofmt` required; keep lifecycle logic explicit and deterministic.
- TypeScript: explicit payload types for events and API responses.
- Event names are contract-like: `market_created`, `series_state`, `market_settled`, `order_rejected`.

## Testing Guidelines
- Manual API checks:
  - `curl http://localhost:8080/markets`
  - `curl http://localhost:8080/markets/<market_id>`
  - `curl http://localhost:8080/users/demo_user_1/balance`
- Verify lifecycle: `active -> settled` with winner/final score fixed.
- Verify ledger: reserve on submit, spend on match, payout/refund on settlement.

## Commit & Pull Request Guidelines
- Use short scoped commits, e.g. `backend: preserve settled state on upsert`.
- Keep backend/adapter/frontend changes grouped by feature slice.
- PR must include: behavior change summary, validation commands, and API/UI evidence.

## Security & Configuration Tips
- Never commit real secrets in `.env*`.
- For Vercel, set:
  - `ENGINE_HTTP_URL=https://<engine-domain>`
  - `NEXT_PUBLIC_ENGINE_HTTP_URL=https://<engine-domain>`
  - `NEXT_PUBLIC_ENGINE_URL=wss://<engine-domain>/ws`
- Raw IP + `ws://` is acceptable for local-only testing, not stable production.
