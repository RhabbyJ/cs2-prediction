package main

import (
	"cs2-prediction-engine/internal/audit"
	"cs2-prediction-engine/internal/compliance"
	"cs2-prediction-engine/internal/engine"
	"cs2-prediction-engine/internal/gateway"
	"fmt"
	"net/http"
	"time"
)

func main() {
	// 1. Initialize Components
	ob := engine.NewOrderBook()
	fb := engine.NewFairnessBuffer(3 * time.Second)
	vcp := audit.NewVeritasChain()
	gw := gateway.NewLocalMiddleware(100) // 100 requests per second

	// 2. Setup Routes with Compliance Middlewares
	mux := http.NewServeMux()

	// Trade Endpoint (Protected)
	tradeHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// In a real app, parse Order from JSON and add to Buffer
		fmt.Fprintln(w, "Trade Received and Buffered")
	})

	// Apply Middlewares (Stacking: Gateway -> GeoComply -> Persona)
	protectedStack := gw.Middleware(
		compliance.GeoComplyMiddleware(
			compliance.PersonaKYCMiddleware(tradeHandler),
		),
	)

	mux.Handle("/api/v1/trade", protectedStack)

	// 3. Start Heartbeat (Process Buffer)
	go func() {
		for {
			time.Sleep(100 * time.Millisecond)
			orders := fb.GetReadyOrders()
			for _, o := range orders {
				matches := ob.ProcessOrder(o)
				for _, m := range matches {
					event := fmt.Sprintf("Match: %d and %d", m.MakerOrderID, m.TakerOrderID)
					vcp.LogEvent(event)
				}
			}
		}
	}()

	fmt.Println("🚀 CS2 Prediction Engine Running on :8080")
	fmt.Println("🔒 Compliance: GeoComply & Persona Active")
	fmt.Println("📊 Audit: VeritasChain (VCP) Active")

	if err := http.ListenAndServe(":8080", mux); err != nil {
		fmt.Printf("❌ Server Failed: %s\n", err)
	}
}
