package engine

import "sync"

type Account struct {
	UserID      string `json:"user_id"`
	Available   int64  `json:"available"`
	Reserved    int64  `json:"reserved"`
	Spent       int64  `json:"spent"`
	RealizedPnL int64  `json:"realized_pnl"`
}

type MarketPosition struct {
	MarketID  string `json:"market_id"`
	YesShares int64  `json:"yes_shares"`
	NoShares  int64  `json:"no_shares"`
	YesCost   int64  `json:"yes_cost"`
	NoCost    int64  `json:"no_cost"`
	Settled   bool   `json:"settled"`
}

type SettlementResult struct {
	UserID      string `json:"user_id"`
	MarketID    string `json:"market_id"`
	Winner      string `json:"winner"`
	Payout      int64  `json:"payout"`
	TotalCost   int64  `json:"total_cost"`
	RealizedPnL int64  `json:"realized_pnl"`
}

type Ledger struct {
	mu              sync.Mutex
	accounts        map[string]*Account
	positionsByUser map[string]map[string]*MarketPosition
}

func NewLedger() *Ledger {
	return &Ledger{
		accounts:        make(map[string]*Account),
		positionsByUser: make(map[string]map[string]*MarketPosition),
	}
}

func (l *Ledger) EnsureUser(userID string, initialBalance int64) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if _, ok := l.accounts[userID]; ok {
		return
	}
	l.accounts[userID] = &Account{
		UserID:    userID,
		Available: initialBalance,
	}
}

func (l *Ledger) Reserve(userID string, amount int64) bool {
	if amount <= 0 {
		return false
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	acc, ok := l.accounts[userID]
	if !ok || acc.Available < amount {
		return false
	}
	acc.Available -= amount
	acc.Reserved += amount
	return true
}

func (l *Ledger) MoveReservedToSpent(userID string, amount int64) {
	if amount <= 0 {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	acc, ok := l.accounts[userID]
	if !ok {
		return
	}
	if amount > acc.Reserved {
		amount = acc.Reserved
	}
	acc.Reserved -= amount
	acc.Spent += amount
}

func (l *Ledger) ReleaseReserved(userID string, amount int64) {
	if amount <= 0 {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	acc, ok := l.accounts[userID]
	if !ok {
		return
	}
	if amount > acc.Reserved {
		amount = acc.Reserved
	}
	acc.Reserved -= amount
	acc.Available += amount
}

func (l *Ledger) AddFill(userID string, marketID string, outcome Outcome, quantity int64, cost int64) {
	if quantity <= 0 {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	userPositions, ok := l.positionsByUser[userID]
	if !ok {
		userPositions = make(map[string]*MarketPosition)
		l.positionsByUser[userID] = userPositions
	}
	position, ok := userPositions[marketID]
	if !ok {
		position = &MarketPosition{MarketID: marketID}
		userPositions[marketID] = position
	}

	if outcome == Yes {
		position.YesShares += quantity
		position.YesCost += cost
	} else {
		position.NoShares += quantity
		position.NoCost += cost
	}
}

func (l *Ledger) GetAccount(userID string) (Account, bool) {
	l.mu.Lock()
	defer l.mu.Unlock()
	acc, ok := l.accounts[userID]
	if !ok {
		return Account{}, false
	}
	return *acc, true
}

func (l *Ledger) GetPositions(userID string) []MarketPosition {
	l.mu.Lock()
	defer l.mu.Unlock()

	userPositions, ok := l.positionsByUser[userID]
	if !ok {
		return []MarketPosition{}
	}

	out := make([]MarketPosition, 0, len(userPositions))
	for _, p := range userPositions {
		out = append(out, *p)
	}
	return out
}

func (l *Ledger) SettleMarket(marketID string, winner Outcome) []SettlementResult {
	l.mu.Lock()
	defer l.mu.Unlock()

	out := make([]SettlementResult, 0)
	for userID, userPositions := range l.positionsByUser {
		position, ok := userPositions[marketID]
		if !ok || position.Settled {
			continue
		}

		totalCost := position.YesCost + position.NoCost
		var winningShares int64
		if winner == Yes {
			winningShares = position.YesShares
		} else {
			winningShares = position.NoShares
		}

		// Contract payoff: winning share pays 100, losing share pays 0.
		payout := winningShares * 100
		realized := payout - totalCost

		acc, ok := l.accounts[userID]
		if ok {
			acc.Available += payout
			if totalCost > acc.Spent {
				totalCost = acc.Spent
			}
			acc.Spent -= totalCost
			acc.RealizedPnL += realized
		}

		position.Settled = true
		out = append(out, SettlementResult{
			UserID:      userID,
			MarketID:    marketID,
			Winner:      string(winner),
			Payout:      payout,
			TotalCost:   totalCost,
			RealizedPnL: realized,
		})
	}

	return out
}
