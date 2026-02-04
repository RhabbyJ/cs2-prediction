package engine

import (
	"container/heap"
	"sync"
	"time"
)

// OrderHeap implements heap.Interface and holds Orders.
type OrderHeap []*Order

func (h OrderHeap) Len() int { return len(h) }
func (h OrderHeap) Less(i, j int) bool {
	// Default is min-heap. For Price-Time priority:
	// Max-Price for Bids, Min-Price for Asks.
	// This will be wrapped in specific Min/Max heap logic.
	return h[i].Price < h[j].Price
}
func (h OrderHeap) Swap(i, j int) { h[i], h[j] = h[j], h[i] }

func (h *OrderHeap) Push(x interface{}) {
	*h = append(*h, x.(*Order))
}

func (h *OrderHeap) Pop() interface{} {
	old := *h
	n := len(old)
	x := old[n-1]
	*h = old[0 : n-1]
	return x
}

// Bids are Max-Heaps (highest price at root)
type BidHeap struct{ OrderHeap }

func (h BidHeap) Less(i, j int) bool {
	if h.OrderHeap[i].Price == h.OrderHeap[j].Price {
		return h.OrderHeap[i].Timestamp.Before(h.OrderHeap[j].Timestamp)
	}
	return h.OrderHeap[i].Price > h.OrderHeap[j].Price
}

// Asks are Min-Heaps (lowest price at root)
type AskHeap struct{ OrderHeap }

func (h AskHeap) Less(i, j int) bool {
	if h.OrderHeap[i].Price == h.OrderHeap[j].Price {
		return h.OrderHeap[i].Timestamp.Before(h.OrderHeap[j].Timestamp)
	}
	return h.OrderHeap[i].Price < h.OrderHeap[j].Price
}

// OrderBook manages the bids and asks for YES and NO outcomes
type OrderBook struct {
	mu sync.Mutex

	// YES Outcome book
	YesBids BidHeap
	YesAsks AskHeap

	// NO Outcome book
	NoBids BidHeap
	NoAsks AskHeap
}

// MarketManager routes orders to their specific market liquidity pools
type MarketManager struct {
	mu      sync.RWMutex
	Markets map[string]*OrderBook
}

func NewMarketManager() *MarketManager {
	return &MarketManager{
		Markets: make(map[string]*OrderBook),
	}
}

func (mm *MarketManager) GetOrderBook(marketID string) *OrderBook {
	mm.mu.RLock()
	ob, ok := mm.Markets[marketID]
	mm.mu.RUnlock()

	if ok {
		return ob
	}

	mm.mu.Lock()
	defer mm.mu.Unlock()
	// Double check
	if ob, ok := mm.Markets[marketID]; ok {
		return ob
	}
	newOB := NewOrderBook()
	mm.Markets[marketID] = newOB
	return newOB
}

// NewOrderBook initializes a new order book
func NewOrderBook() *OrderBook {
	ob := &OrderBook{}
	heap.Init(&ob.YesBids)
	heap.Init(&ob.YesAsks)
	heap.Init(&ob.NoBids)
	heap.Init(&ob.NoAsks)
	return ob
}

func (ob *OrderBook) ProcessOrder(incoming *Order) []Match {
	ob.mu.Lock()
	defer ob.mu.Unlock()

	var matches []Match

	if incoming.Outcome == Yes {
		if incoming.Side == Buy {
			matches = ob.match(incoming, &ob.YesAsks, &ob.NoBids, true)
		} else {
			matches = ob.match(incoming, &ob.YesBids, &ob.NoAsks, false)
		}
	} else {
		if incoming.Side == Buy {
			matches = ob.match(incoming, &ob.NoAsks, &ob.YesBids, true)
		} else {
			matches = ob.match(incoming, &ob.NoBids, &ob.YesAsks, false)
		}
	}

	// If order is not fully filled, add to book
	if incoming.Quantity > 0 {
		ob.addToBook(incoming)
	}

	return matches
}

func (ob *OrderBook) match(incoming *Order, traditional heap.Interface, complementary heap.Interface, isBuy bool) []Match {
	var matches []Match

	// 1. Match against Traditional side
	for traditional.Len() > 0 && incoming.Quantity > 0 {
		bestOther := traditional.(interface{ Peek() *Order }).Peek()

		canMatch := false
		if isBuy {
			canMatch = incoming.Price >= bestOther.Price
		} else {
			canMatch = incoming.Price <= bestOther.Price
		}

		if !canMatch {
			break
		}

		matchQty := min(incoming.Quantity, bestOther.Quantity)
		matches = append(matches, Match{
			MakerOrderID: bestOther.ID,
			TakerOrderID: incoming.ID,
			Price:        bestOther.Price,
			Quantity:     matchQty,
			Timestamp:    time.Now(),
		})

		incoming.Quantity -= matchQty
		bestOther.Quantity -= matchQty

		if bestOther.Quantity == 0 {
			heap.Pop(traditional)
		}
	}

	// 2. Match against Complementary side (Yes + No = 100)
	for complementary.Len() > 0 && incoming.Quantity > 0 {
		bestOther := complementary.(interface{ Peek() *Order }).Peek()

		// For Complementary: if I buy YES at 60, I can match someone buying NO at 40 (or less)
		// because 60 + 40 = 100. Actually, if they buy NO at 30, it's even better for me.
		// Rule: incoming.Price + bestOther.Price >= 100
		if incoming.Price+bestOther.Price < 100 {
			break
		}

		matchQty := min(incoming.Quantity, bestOther.Quantity)
		matches = append(matches, Match{
			MakerOrderID: bestOther.ID,
			TakerOrderID: incoming.ID,
			Price:        incoming.Price, // Settlement happens at the incoming price in this simple model
			Quantity:     matchQty,
			Timestamp:    time.Now(),
		})

		incoming.Quantity -= matchQty
		bestOther.Quantity -= matchQty

		if bestOther.Quantity == 0 {
			heap.Pop(complementary)
		}
	}

	return matches
}

func (ob *OrderBook) addToBook(order *Order) {
	if order.Outcome == Yes {
		if order.Side == Buy {
			heap.Push(&ob.YesBids, order)
		} else {
			heap.Push(&ob.YesAsks, order)
		}
	} else {
		if order.Side == Buy {
			heap.Push(&ob.NoBids, order)
		} else {
			heap.Push(&ob.NoAsks, order)
		}
	}
}

// Helper: Peek gets the top element without removing it
func (h BidHeap) Peek() *Order { return h.OrderHeap[0] }
func (h AskHeap) Peek() *Order { return h.OrderHeap[0] }

func min(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}
