# Codex State

## Environment
- VPS services: `engine`, `adapter`, `redis` via `docker compose`.
- Frontend deployed on Vercel (root: `frontend`).
- Local testing works with direct VPS IP (`http/ws`) from `localhost` frontend.

## Access Facts
- GRID key works on `https://api-op.grid.gg/central-data/graphql`.
- GRID key is unauthorized on `https://api.grid.gg/central-data/graphql`.

## Blocking/Operational Notes
- Vercel frontend currently cannot reliably use raw `ws://<ip>:8080/ws` from HTTPS origin.
- Need public TLS backend domain (e.g. `https://engine.<domain>`, `wss://engine.<domain>/ws`).

## Current Risk
- No guaranteed trade matching yet; without opposing liquidity, payouts stay zero.
- Activity feed is client-memory only (lost on refresh).
