package main

import (
	"encoding/json"
	"fmt"
	"log"
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
			fmt.Println("👤 Client Connected")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()
			fmt.Println("👤 Client Disconnected")

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

var (
	hub           *Hub
	marketManager *engine.MarketManager
	buffer        *engine.FairnessBuffer
	auditLog      *audit.VeritasChain
)

func main() {
	hub = NewHub()
	marketManager = engine.NewMarketManager()
	buffer = engine.NewFairnessBuffer(3 * time.Second)
	auditLog = audit.NewVeritasChain()

	go hub.Run()
	go processBuffer()

	http.HandleFunc("/ws", handleWebSocket)

	fmt.Println("🚀 Information Finance Engine Live on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("❌ Server Failed: %v", err)
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("❌ Upgrade Error: %v", err)
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
			buffer.Add(&order) // Use Add instead of AddOrder
			fmt.Printf("📥 Order Buffered: %s %s @ %d (Market: %s)\n", order.Side, order.Outcome, order.Price, order.MarketID)
		} else if msg["type"] == "game_event" {
			hub.broadcast <- message
		}
	}
}

func processBuffer() {
	for {
		batch := buffer.GetReadyOrders()
		for _, order := range batch {
			ob := marketManager.GetOrderBook(order.MarketID)
			matches := ob.ProcessOrder(order)

			for _, m := range matches {
				auditLog.LogMatch(m) // Use auditLog instance

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
