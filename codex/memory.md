# Codex Memory

## Project
- Name: CS2_Prediction
- Goal: Production-shaped esports prediction market with verifiable market lifecycle, trading, and settlement.

## What Is Implemented
- Provider pattern live:
  - `adapter`: GRID Open Access discovery + deterministic mock in-play feed.
- Market lifecycle in backend:
  - `active -> suspended/active -> settled`.
  - `settled` is terminal (no auto-downgrade).
- Market registry API:
  - `GET /markets`
  - `GET /markets/{market_id}`
- Registry stores:
  - metadata, status, game_state, winner, settled_at, final_score.
- Dummy ledger in backend:
  - balance reserve/spent/realized_pnl
  - buy/sell collateral rules
  - positions and settlement payout logic.
- User APIs:
  - `GET /users/{userId}/balance`
  - `GET /users/{userId}/positions`
- Frontend updates:
  - engine market feed + pinned market via `NEXT_PUBLIC_TEST_MARKET_ID`
  - order ticket (BUY/SELL YES/NO), account panel, positions preview, activity feed.

## Current Known Behavior
- If orders are unmatched, funds are reserved then refunded on settlement.
- Positions only appear after matched trades.
- Vercel requires TLS (`https`/`wss`) to reach VPS engine reliably.
