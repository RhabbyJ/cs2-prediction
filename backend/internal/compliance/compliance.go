package compliance

import (
	"fmt"
	"net/http"
)

// GeoComplyMiddleware blocks users from prohibited states (CA, NY)
func GeoComplyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// In a real scenario, we'd call GeoComply's API with GPS/WiFi data
		state := r.Header.Get("X-User-State")

		if state == "CA" || state == "NY" {
			http.Error(w, fmt.Sprintf("Access denied in %s (Regulatory Compliance AB831/S5935A)", state), http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// PersonaKYCMiddleware ensures the user is a 'Gaming Verified Human'
func PersonaKYCMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		isVerified := r.Header.Get("X-User-Verified")

		if isVerified != "true" {
			http.Error(w, "Persona KYC Verification Required", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
