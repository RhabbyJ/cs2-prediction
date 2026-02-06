package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"sync"
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

var (
	hub                     *Hub
	marketManager           *engine.MarketManager
	marketRegistry          *engine.MarketRegistry
	buffer                  *engine.FairnessBuffer
	auditLog                *audit.VeritasChain
	lastSeriesStateByMarket = map[string]GameState{}
	stateMu                 sync.Mutex
)

func main() {
	hub = NewHub()
	marketManager = engine.NewMarketManager()
	marketRegistry = engine.NewMarketRegistry()
	buffer = engine.NewFairnessBuffer(3 * time.Second)
	auditLog = audit.NewVeritasChain()

	go hub.Run()
	go processBuffer()

	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/markets", handleMarkets)

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

			ob := marketManager.GetOrderBook(order.MarketID)
			if ob.IsTradingSuspended() {
				rejectMsg, _ := json.Marshal(map[string]interface{}{
					"type": "order_rejected",
					"payload": map[string]interface{}{
						"market_id": order.MarketID,
						"reason":    "trading_suspended",
					},
				})
				if err := conn.WriteMessage(websocket.TextMessage, rejectMsg); err != nil {
					log.Printf("Failed to send order rejection: %v", err)
				}
				continue
			}

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
			if isScoreAnomalous(marketID, payload.GameState) {
				suspendMarket(marketID, "score_anomaly")
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

func isScoreAnomalous(marketID string, state GameState) bool {
	stateMu.Lock()
	defer stateMu.Unlock()

	prev, ok := lastSeriesStateByMarket[marketID]
	lastSeriesStateByMarket[marketID] = state
	if !ok {
		return false
	}

	deltaT := math.Abs(float64(state.TerroristScore - prev.TerroristScore))
	deltaCT := math.Abs(float64(state.CTScore - prev.CTScore))
	return deltaT > 3 || deltaCT > 3
}

func suspendMarket(marketID string, reason string) {
	ob := marketManager.GetOrderBook(marketID)
	ob.SuspendTrading()
	marketRegistry.UpdateMarketStatus(marketID, "suspended")
	log.Printf("Market suspended: %s (reason=%s)", marketID, reason)
}

func resumeMarket(marketID string, reason string) {
	ob := marketManager.GetOrderBook(marketID)
	ob.ResumeTrading()
	marketRegistry.UpdateMarketStatus(marketID, "active")
	log.Printf("Market resumed: %s (reason=%s)", marketID, reason)
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

func processBuffer() {
	for {
		batch := buffer.GetReadyOrders()
		for _, order := range batch {
			ob := marketManager.GetOrderBook(order.MarketID)
			matches := ob.ProcessOrder(order)

			for _, m := range matches {
				auditLog.LogMatch(m)

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
