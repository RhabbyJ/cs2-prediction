package engine

import (
	"time"
)

type Side string

const (
	Buy  Side = "BUY"
	Sell Side = "SELL"
)

type Outcome string

const (
	Yes Outcome = "YES"
	No  Outcome = "NO"
)

type Order struct {
	ID        uint64    `json:"id"`
	UserID    string    `json:"user_id"`
	Side      Side      `json:"side"`
	Outcome   Outcome   `json:"outcome"`
	Price     int64     `json:"price"` // Fixed point: 1-99 for binary contracts
	Quantity  int64     `json:"quantity"`
	Timestamp time.Time `json:"timestamp"`
}

type Match struct {
	MakerOrderID uint64    `json:"maker_order_id"`
	TakerOrderID uint64    `json:"taker_order_id"`
	Price        int64     `json:"price"`
	Quantity     int64     `json:"quantity"`
	Timestamp    time.Time `json:"timestamp"`
}
