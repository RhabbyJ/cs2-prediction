package main

import (
	"cs2-prediction-engine/internal/audit"
	"cs2-prediction-engine/internal/compliance"
	"cs2-prediction-engine/internal/engine"
	"cs2-prediction-engine/internal/gateway"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Hub manages active WebSocket clients (Frontend and Adapter)
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

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func main() {
	// 1. Initialize Components
	ob := engine.NewOrderBook()
	fb := engine.NewFairnessBuffer(3 * time.Second)
	vcp := audit.NewVeritasChain()
	gw := gateway.NewLocalMiddleware(100)
	hub := NewHub()

	go hub.Run()

	// 2. Setup Routes
	mux := http.NewServeMux()

	// WebSocket Endpoint (Dual Purpose: Adapter Push & Client Pull)
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("❌ Upgrade Error: %v", err)
			return
		}
		hub.register <- conn

		// Listen for messages (mostly from Adapter)
		go func() {
			defer func() { hub.unregister <- conn }()
			for {
				_, message, err := conn.ReadMessage()
				if err != nil {
					break
				}
				// If message is from adapter, broadcast it to all (Frontend)
				hub.broadcast <- message

				// Audit the event
				vcp.LogEvent(fmt.Sprintf("Event: %s", string(message)))
			}
		}()
	})

	// Classic REST Trade Endpoint
	tradeHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "Buffered")
	})

	protectedStack := gw.Middleware(
		compliance.GeoComplyMiddleware(
			compliance.PersonaKYCMiddleware(tradeHandler),
		),
	)

	mux.Handle("/api/v1/trade", protectedStack)

	// 3. Start Heartbeat
	go func() {
		for {
			time.Sleep(1 * time.Second)

			// Process buffered orders
			ready := fb.GetReadyOrders()
			for _, o := range ready {
				matches := ob.ProcessOrder(o)
				for _, m := range matches {
					matchEvent, _ := json.Marshal(map[string]interface{}{
						"type":    "match_occurred",
						"payload": m,
					})
					hub.broadcast <- matchEvent
					vcp.LogEvent(fmt.Sprintf("Match: %d and %d", m.MakerOrderID, m.TakerOrderID))
				}
			}

			// Periodically broadcast order book snapshot
			// hub.broadcast <- []byte(`{"type": "ob_snapshot", "payload": "..."}`)
		}
	}()

	fmt.Println("🚀 Information Finance Engine Live on :8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatal(err)
	}
}
