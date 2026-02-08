# Codex Tasks

## Now
- [x] Tune circuit breaker thresholds and resume logic to avoid blanket suspension.
- [ ] Verify `settled` status transition when `series_state.game_state.phase = ended`.
- [ ] Validate `/markets/{market_id}` from VPS and frontend proxy.

## Next
- [ ] Add market sorting/filtering (active first, then start time).
- [ ] Add frontend detail panel for selected market using `/api/engine/markets/[marketId]`.
- [ ] Add explicit admin/manual suspend and resume event path.

## Later
- [ ] Replace mock in-play provider with commercial live feed provider.
- [ ] Add settlement pipeline and outcomes finalization.
- [ ] Add audit snapshot commitments for investor/demo transparency.

## Resume Prompt
Continue from codex/tasks.md and first fix over-aggressive circuit breaker suspension while preserving anomaly protection.
