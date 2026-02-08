# Codex Tasks

## Now
- [x] Tune circuit breaker and add auto-recovery.
- [x] Enforce terminal `settled` behavior.
- [x] Add registry winner/final_score fields.
- [x] Add dummy ledger + user balance/positions APIs.
- [ ] Configure TLS engine endpoint for Vercel (`https` + `wss`).
- [ ] Verify Vercel order submission works end-to-end after TLS.

## Next
- [ ] Add synthetic counterparty/liquidity bot so orders match deterministically.
- [ ] Add persistent order/activity history API (survives refresh).
- [ ] Add frontend payout panel with per-market settlement breakdown.

## Later
- [ ] Persist markets/orders/ledger in Supabase (or Postgres).
- [ ] Add outcome resolution + payout audit trail tables.
- [ ] Replace mock in-play provider with commercial live feed provider.

## Resume Prompt
Continue by implementing a minimal market-maker bot (narrow spread around midpoint) so demo orders match and payout flow is visible without manual counter-orders.
