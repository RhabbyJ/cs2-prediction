# Codex Memory

## Project
- Name: CS2_Prediction
- Goal: Build a production-shaped esports prediction market stack with provider abstraction and auditable market lifecycle.

## Stable Decisions
- Use Provider Pattern for data ingest.
- Use GRID Open Access for discovery/metadata.
- Use deterministic mock in-play provider until commercial live feed access.
- Keep matching/pricing engine data-source agnostic.
- Store market metadata in backend registry and expose via API.

## Architecture Notes
- Backend: Go websocket engine + orderbook + market registry.
- Adapter: TypeScript provider orchestrator emitting market and series events.
- Frontend: Next.js dashboard with Grid explorer + engine market feed.

## Deployed Reality (latest verified)
- `GET /markets` works and returns populated market metadata.
- Frontend shows engine markets and market status in UI.
- Current issue observed: many/all markets show `SUSPENDED` (circuit breaker likely too aggressive).

## Important Endpoints
- Engine WS: `/ws`
- Engine list: `/markets`
- Engine detail: `/markets/{market_id}`
- Frontend API proxy: `/api/engine/markets`, `/api/engine/markets/[marketId]`
