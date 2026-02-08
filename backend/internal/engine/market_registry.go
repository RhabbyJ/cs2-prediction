package engine

import "sync"

type MarketMetadata struct {
	MarketID   string           `json:"market_id"`
	SeriesID   string           `json:"series_id"`
	Title      string           `json:"title"`
	Tournament string           `json:"tournament"`
	Teams      []string         `json:"teams"`
	StartTime  string           `json:"start_time,omitempty"`
	Status     string           `json:"status"`
	GameState  *MarketGameState `json:"game_state,omitempty"`
}

type MarketGameState struct {
	Map            string `json:"map"`
	Round          int    `json:"round"`
	TerroristScore int    `json:"terrorist_score"`
	CTScore        int    `json:"ct_score"`
	BombPlanted    bool   `json:"bomb_planted"`
	Phase          string `json:"phase"`
	LastAction     string `json:"last_action"`
	Timestamp      string `json:"timestamp,omitempty"`
}

type MarketRegistry struct {
	mu      sync.RWMutex
	markets map[string]MarketMetadata
}

func NewMarketRegistry() *MarketRegistry {
	return &MarketRegistry{
		markets: make(map[string]MarketMetadata),
	}
}

func (mr *MarketRegistry) UpsertMarket(meta MarketMetadata) {
	mr.mu.Lock()
	defer mr.mu.Unlock()
	mr.markets[meta.MarketID] = meta
}

func (mr *MarketRegistry) UpdateMarketStatus(marketID string, status string) bool {
	mr.mu.Lock()
	defer mr.mu.Unlock()

	meta, ok := mr.markets[marketID]
	if !ok {
		return false
	}
	meta.Status = status
	mr.markets[marketID] = meta
	return true
}

func (mr *MarketRegistry) UpdateMarketGameState(marketID string, gameState MarketGameState) bool {
	mr.mu.Lock()
	defer mr.mu.Unlock()

	meta, ok := mr.markets[marketID]
	if !ok {
		return false
	}
	meta.GameState = &gameState
	mr.markets[marketID] = meta
	return true
}

func (mr *MarketRegistry) GetMarket(marketID string) (MarketMetadata, bool) {
	mr.mu.RLock()
	defer mr.mu.RUnlock()
	meta, ok := mr.markets[marketID]
	return meta, ok
}

func (mr *MarketRegistry) ListMarkets() []MarketMetadata {
	mr.mu.RLock()
	defer mr.mu.RUnlock()

	out := make([]MarketMetadata, 0, len(mr.markets))
	for _, meta := range mr.markets {
		out = append(out, meta)
	}
	return out
}
