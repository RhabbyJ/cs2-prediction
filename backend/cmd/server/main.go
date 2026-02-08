package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"cs2-prediction-engine/internal/audit"
	"cs2-prediction-engine/internal/engine"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// Hub manages active WebSocket clients
type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan []byte
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			fmt.Println("Client Connected")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()
			fmt.Println("Client Disconnected")

		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				err := client.WriteMessage(websocket.TextMessage, message)
				if err != nil {
					client.Close()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

type AdapterSeriesStatePayload struct {
	SeriesID  string    `json:"series_id"`
	Timestamp string    `json:"timestamp"`
	GameState GameState `json:"game_state"`
}

type GameState struct {
	Map            string `json:"map"`
	Round          int    `json:"round"`
	TerroristScore int    `json:"terrorist_score"`
	CTScore        int    `json:"ct_score"`
	BombPlanted    bool   `json:"bomb_planted"`
	Phase          string `json:"phase"`
	LastAction     string `json:"last_action"`
}

type AdapterMarketCreatedPayload struct {
	SeriesID   string   `json:"series_id"`
	MarketID   string   `json:"market_id"`
	Title      string   `json:"title"`
	Tournament string   `json:"tournament"`
	Teams      []string `json:"teams"`
	StartTime  string   `json:"start_time"`
}

type AdapterCircuitBreakerPayload struct {
	SeriesID string `json:"series_id"`
	MarketID string `json:"market_id"`
	Reason   string `json:"reason"`
	Action   string `json:"action"`
}

type MarketHealthState struct {
	LastState         GameState
	HasLastState      bool
	SuspendedByReason string
	HealthyStreak     int
}

type OrderRecord struct {
	Order             engine.Order
	ReservedRemaining int64
}

var (
	hub              *Hub
	marketManager    *engine.MarketManager
	marketRegistry   *engine.MarketRegistry
	ledger           *engine.Ledger
	buffer           *engine.FairnessBuffer
	auditLog         *audit.VeritasChain
	marketHealthByID = map[string]*MarketHealthState{}
	orderRecords     = map[uint64]*OrderRecord{}
	orderMu          sync.Mutex
	nextOrderID      uint64
	stateMu          sync.Mutex
)

const (
	defaultUserID         = "demo_user_1"
	defaultInitialBalance = int64(1000000) // 10,000 IFC with 2 implied decimals
)

func main() {
	hub = NewHub()
	marketManager = engine.NewMarketManager()
	marketRegistry = engine.NewMarketRegistry()
	ledger = engine.NewLedger()
	ledger.EnsureUser(defaultUserID, defaultInitialBalance)
	buffer = engine.NewFairnessBuffer(3 * time.Second)
	auditLog = audit.NewVeritasChain()

	go hub.Run()
	go processBuffer()

	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/markets", handleMarkets)
	http.HandleFunc("/markets/", handleMarketByID)
	http.HandleFunc("/users/", handleUserBalance)

	fmt.Println("Information Finance Engine Live on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Server Failed: %v", err)
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Upgrade Error: %v", err)
		return
	}
	hub.register <- conn

	defer func() {
		hub.unregister <- conn
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		if msg["type"] == "place_order" {
			orderBytes, _ := json.Marshal(msg["payload"])
			var order engine.Order
			json.Unmarshal(orderBytes, &order)
			order.Timestamp = time.Now()

			if order.UserID == "" {
				order.UserID = defaultUserID
			}
			if order.Quantity <= 0 || order.Price <= 0 || order.Price >= 100 {
				sendOrderRejected(conn, order.MarketID, "invalid_order_payload")
				continue
			}
			if order.ID == 0 {
				order.ID = atomic.AddUint64(&nextOrderID, 1)
			}

			ob := marketManager.GetOrderBook(order.MarketID)
			if ob.IsTradingSuspended() {
				sendOrderRejected(conn, order.MarketID, "trading_suspended")
				continue
			}
			if meta, ok := marketRegistry.GetMarket(order.MarketID); ok && meta.Status == "settled" {
				sendOrderRejected(conn, order.MarketID, "market_settled")
				continue
			}

			requiredReserve := requiredReserveForOrder(order)
			ledger.EnsureUser(order.UserID, defaultInitialBalance)
			if !ledger.Reserve(order.UserID, requiredReserve) {
				sendOrderRejected(conn, order.MarketID, "insufficient_balance")
				continue
			}
			storeOrderRecord(order, requiredReserve)

			buffer.Add(&order)
			fmt.Printf("Order Buffered: %s %s @ %d (Market: %s)\n", order.Side, order.Outcome, order.Price, order.MarketID)
		} else if msg["type"] == "market_created" {
			payloadBytes, _ := json.Marshal(msg["payload"])
			var payload AdapterMarketCreatedPayload
			if err := json.Unmarshal(payloadBytes, &payload); err != nil {
				log.Printf("Failed to parse market_created payload: %v", err)
				continue
			}
			marketManager.GetOrderBook(payload.MarketID)
			marketRegistry.UpsertMarket(engine.MarketMetadata{
				MarketID:   payload.MarketID,
				SeriesID:   payload.SeriesID,
				Title:      payload.Title,
				Tournament: payload.Tournament,
				Teams:      payload.Teams,
				StartTime:  payload.StartTime,
				Status:     "active",
			})
			hub.broadcast <- message
		} else if msg["type"] == "series_state" {
			payloadBytes, _ := json.Marshal(msg["payload"])
			var payload AdapterSeriesStatePayload
			if err := json.Unmarshal(payloadBytes, &payload); err != nil {
				log.Printf("Failed to parse series_state payload: %v", err)
				continue
			}

			marketID := "series_" + payload.SeriesID + "_winner"
			marketManager.GetOrderBook(marketID)

			if meta, ok := marketRegistry.GetMarket(marketID); ok && meta.Status == "settled" {
				continue
			}

			marketRegistry.UpdateMarketGameState(marketID, engine.MarketGameState{
				Map:            payload.GameState.Map,
				Round:          payload.GameState.Round,
				TerroristScore: payload.GameState.TerroristScore,
				CTScore:        payload.GameState.CTScore,
				BombPlanted:    payload.GameState.BombPlanted,
				Phase:          payload.GameState.Phase,
				LastAction:     payload.GameState.LastAction,
				Timestamp:      payload.Timestamp,
			})

			if isScoreAnomalous(marketID, payload.GameState) {
				suspendMarket(marketID, "score_anomaly")
			} else {
				maybeResumeAfterHealthyUpdates(marketID)
			}
			if payload.GameState.Phase == "ended" {
				marketRegistry.UpdateMarketStatus(marketID, "settled")
				settleMarket(marketID, payload)
			}

			gameEventMsg, _ := json.Marshal(map[string]interface{}{
				"type": "game_event",
				"payload": map[string]interface{}{
					"series_id": payload.SeriesID,
					"game_state": map[string]interface{}{
						"round":           payload.GameState.Round,
						"terrorist_score": payload.GameState.TerroristScore,
						"ct_score":        payload.GameState.CTScore,
						"bomb_planted":    payload.GameState.BombPlanted,
					},
					"last_action": payload.GameState.LastAction,
				},
			})
			hub.broadcast <- gameEventMsg
			hub.broadcast <- message
		} else if msg["type"] == "circuit_breaker" {
			payloadBytes, _ := json.Marshal(msg["payload"])
			var payload AdapterCircuitBreakerPayload
			if err := json.Unmarshal(payloadBytes, &payload); err != nil {
				log.Printf("Failed to parse circuit_breaker payload: %v", err)
				continue
			}
			if payload.Action == "suspend" {
				suspendMarket(payload.MarketID, payload.Reason)
			} else if payload.Action == "resume" {
				resumeMarket(payload.MarketID, payload.Reason)
			}
			hub.broadcast <- message
		} else if msg["type"] == "game_event" {
			hub.broadcast <- message
		}
	}
}

func sendOrderRejected(conn *websocket.Conn, marketID string, reason string) {
	rejectMsg, _ := json.Marshal(map[string]interface{}{
		"type": "order_rejected",
		"payload": map[string]interface{}{
			"market_id": marketID,
			"reason":    reason,
		},
	})
	if err := conn.WriteMessage(websocket.TextMessage, rejectMsg); err != nil {
		log.Printf("Failed to send order rejection: %v", err)
	}
}

func storeOrderRecord(order engine.Order, reserved int64) {
	orderMu.Lock()
	defer orderMu.Unlock()
	orderRecords[order.ID] = &OrderRecord{
		Order:             order,
		ReservedRemaining: reserved,
	}
}

func settleMarket(marketID string, payload AdapterSeriesStatePayload) {
	winner := engine.No
	winnerLabel := "NO"
	if payload.GameState.TerroristScore > payload.GameState.CTScore {
		winner = engine.Yes
		winnerLabel = "YES"
	}

	refundOpenReservesForMarket(marketID)
	results := ledger.SettleMarket(marketID, winner)
	finalScore := fmt.Sprintf("%d-%d", payload.GameState.TerroristScore, payload.GameState.CTScore)
	marketRegistry.UpdateSettlement(marketID, winnerLabel, payload.Timestamp, finalScore)

	settlementMsg, _ := json.Marshal(map[string]interface{}{
		"type": "market_settled",
		"payload": map[string]interface{}{
			"market_id":   marketID,
			"winner":      winnerLabel,
			"final_score": finalScore,
			"settled_at":  payload.Timestamp,
			"payouts":     results,
		},
	})
	hub.broadcast <- settlementMsg
}

func refundOpenReservesForMarket(marketID string) {
	orderMu.Lock()
	defer orderMu.Unlock()

	for _, record := range orderRecords {
		if record.Order.MarketID != marketID || record.ReservedRemaining <= 0 {
			continue
		}
		ledger.ReleaseReserved(record.Order.UserID, record.ReservedRemaining)
		record.ReservedRemaining = 0
	}
}

func applyMatchAccounting(marketID string, match engine.Match) {
	orderMu.Lock()
	defer orderMu.Unlock()

	applyForOrder := func(orderID uint64) {
		record, ok := orderRecords[orderID]
		if !ok {
			return
		}
		effectiveOutcome, cost := effectiveOutcomeAndCost(record.Order, match.Price, match.Quantity)
		if cost > record.ReservedRemaining {
			cost = record.ReservedRemaining
		}
		if cost > 0 {
			ledger.MoveReservedToSpent(record.Order.UserID, cost)
			record.ReservedRemaining -= cost
		}
		ledger.AddFill(record.Order.UserID, marketID, effectiveOutcome, match.Quantity, cost)
	}

	applyForOrder(match.MakerOrderID)
	applyForOrder(match.TakerOrderID)
}

func requiredReserveForOrder(order engine.Order) int64 {
	if order.Side == engine.Buy {
		return order.Price * order.Quantity
	}
	// Selling YES at P is equivalent to long NO at (100-P), and vice-versa.
	return (100 - order.Price) * order.Quantity
}

func effectiveOutcomeAndCost(order engine.Order, executionPrice int64, quantity int64) (engine.Outcome, int64) {
	if order.Side == engine.Buy {
		return order.Outcome, executionPrice * quantity
	}

	opp := engine.Yes
	if order.Outcome == engine.Yes {
		opp = engine.No
	}
	if order.Outcome == engine.No {
		opp = engine.Yes
	}
	return opp, (100 - executionPrice) * quantity
}

func isScoreAnomalous(marketID string, state GameState) bool {
	stateMu.Lock()
	defer stateMu.Unlock()

	health, ok := marketHealthByID[marketID]
	if !ok {
		health = &MarketHealthState{}
		marketHealthByID[marketID] = health
	}

	if !health.HasLastState {
		health.LastState = state
		health.HasLastState = true
		return false
	}

	prev := health.LastState
	roundDelta := state.Round - prev.Round
	deltaT := int(math.Abs(float64(state.TerroristScore - prev.TerroristScore)))
	deltaCT := int(math.Abs(float64(state.CTScore - prev.CTScore)))
	totalScoreDelta := deltaT + deltaCT

	health.LastState = state

	// A round cannot go backwards in a valid stream.
	if roundDelta < 0 {
		health.HealthyStreak = 0
		return true
	}

	// If round doesn't advance, score should not advance either.
	if roundDelta == 0 && totalScoreDelta > 0 {
		health.HealthyStreak = 0
		return true
	}

	// Across N rounds, score can increase by at most N total points.
	if roundDelta > 0 && totalScoreDelta > roundDelta {
		health.HealthyStreak = 0
		return true
	}

	health.HealthyStreak++
	return false
}

func suspendMarket(marketID string, reason string) {
	if meta, ok := marketRegistry.GetMarket(marketID); ok && meta.Status == "settled" {
		return
	}

	ob := marketManager.GetOrderBook(marketID)
	ob.SuspendTrading()
	marketRegistry.UpdateMarketStatus(marketID, "suspended")

	stateMu.Lock()
	health, ok := marketHealthByID[marketID]
	if !ok {
		health = &MarketHealthState{}
		marketHealthByID[marketID] = health
	}
	health.SuspendedByReason = reason
	health.HealthyStreak = 0
	stateMu.Unlock()

	log.Printf("Market suspended: %s (reason=%s)", marketID, reason)
}

func resumeMarket(marketID string, reason string) {
	if meta, ok := marketRegistry.GetMarket(marketID); ok && meta.Status == "settled" {
		return
	}

	ob := marketManager.GetOrderBook(marketID)
	ob.ResumeTrading()
	marketRegistry.UpdateMarketStatus(marketID, "active")

	stateMu.Lock()
	if health, ok := marketHealthByID[marketID]; ok {
		health.SuspendedByReason = ""
		health.HealthyStreak = 0
	}
	stateMu.Unlock()

	log.Printf("Market resumed: %s (reason=%s)", marketID, reason)
}

func maybeResumeAfterHealthyUpdates(marketID string) {
	stateMu.Lock()
	health, ok := marketHealthByID[marketID]
	if !ok {
		stateMu.Unlock()
		return
	}

	shouldResume := health.SuspendedByReason == "score_anomaly" && health.HealthyStreak >= 3
	stateMu.Unlock()

	if shouldResume {
		resumeMarket(marketID, "auto_recovered_after_healthy_streak")
	}
}

func handleMarkets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"markets": marketRegistry.ListMarkets(),
	}); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
}

func handleMarketByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	marketID := strings.TrimPrefix(r.URL.Path, "/markets/")
	if marketID == "" || strings.Contains(marketID, "/") {
		http.Error(w, "invalid market id", http.StatusBadRequest)
		return
	}

	meta, ok := marketRegistry.GetMarket(marketID)
	if !ok {
		http.Error(w, "market not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"market": meta,
	}); err != nil {
		http.Error(w, "failed to encode response", http.StatusInternalServerError)
		return
	}
}

func handleUserBalance(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Expected: /users/{userID}/balance or /users/{userID}/positions
	path := strings.TrimPrefix(r.URL.Path, "/users/")
	parts := strings.Split(path, "/")
	if len(parts) != 2 || parts[0] == "" {
		http.Error(w, "invalid user resource path", http.StatusBadRequest)
		return
	}

	switch parts[1] {
	case "balance":
		account, ok := ledger.GetAccount(parts[0])
		if !ok {
			http.Error(w, "user not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"account": account,
		}); err != nil {
			http.Error(w, "failed to encode response", http.StatusInternalServerError)
			return
		}
	case "positions":
		positions := ledger.GetPositions(parts[0])
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"positions": positions,
		}); err != nil {
			http.Error(w, "failed to encode response", http.StatusInternalServerError)
			return
		}
	default:
		http.Error(w, "unknown user resource", http.StatusBadRequest)
	}
}

func processBuffer() {
	for {
		batch := buffer.GetReadyOrders()
		for _, order := range batch {
			ob := marketManager.GetOrderBook(order.MarketID)
			matches := ob.ProcessOrder(order)

			for _, m := range matches {
				auditLog.LogMatch(m)
				applyMatchAccounting(order.MarketID, m)

				matchMsg, _ := json.Marshal(map[string]interface{}{
					"type":    "match_occurred",
					"payload": m,
				})
				hub.broadcast <- matchMsg
			}
		}
		time.Sleep(100 * time.Millisecond)
	}
}
