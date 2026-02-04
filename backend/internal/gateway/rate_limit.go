package gateway

import (
	"context"
	"net/http"
	"sync"
	"time"
)

// IngressHandler defines the swapable interface for our gateway
type IngressHandler interface {
	Middleware(next http.Handler) http.Handler
	Authorize(ctx context.Context, token string) (bool, error)
}

// LocalMiddleware is our PoC rate-limited gateway
type LocalMiddleware struct {
	rateLimit map[string]int
	mu        sync.Mutex
	capacity  int
}

func NewLocalMiddleware(capacity int) *LocalMiddleware {
	return &LocalMiddleware{
		rateLimit: make(map[string]int),
		capacity:  capacity,
	}
}

// Middleware implements rate limiting (Token Bucket style PoC)
func (lm *LocalMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clientIP := r.RemoteAddr

		lm.mu.Lock()
		count := lm.rateLimit[clientIP]
		if count >= lm.capacity {
			lm.mu.Unlock()
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		lm.rateLimit[clientIP]++
		lm.mu.Unlock()

		// Reset count after 1 second
		go func() {
			time.Sleep(1 * time.Second)
			lm.mu.Lock()
			lm.rateLimit[clientIP]--
			lm.mu.Unlock()
		}()

		next.ServeHTTP(w, r)
	})
}

func (lm *LocalMiddleware) Authorize(ctx context.Context, token string) (bool, error) {
	// PoC implementation
	return token != "", nil
}
