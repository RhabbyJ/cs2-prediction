# Codex State

## Current Assumptions
- GRID API key is valid for `https://api-op.grid.gg/central-data/graphql`.
- GRID API key is not authorized for `https://api.grid.gg/central-data/graphql`.
- Adapter discovery + market creation is functional.
- Backend registry ingestion is functional.

## Current Risks
- Circuit breaker can suspend too many markets and stay suspended.
- Frontend lint has pre-existing `no-explicit-any` errors in `frontend/src/app/page.tsx` and `frontend/src/lib/grid/client.ts`.

## Environment
- VPS runs docker compose services: `engine`, `adapter`, `redis`.
- Frontend deployed separately (Vercel, root set to `frontend`).

## Known Good Checks
- `curl -s http://localhost:8080/markets`
- `docker compose logs --tail=150 adapter`
- `docker compose logs --tail=150 engine`
