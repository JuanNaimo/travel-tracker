package middleware

import (
	"sync"
	"time"
)

// RateLimiter limita intentos por clave en una ventana fija. Es en memoria,
// suficiente para una única instancia de la API.
type RateLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	entries map[string]*rateEntry
}

type rateEntry struct {
	count   int
	resetAt time.Time
}

// NewRateLimiter crea un limitador de `limit` intentos cada `window`
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{limit: limit, window: window, entries: make(map[string]*rateEntry)}
}

// Allow registra un intento y devuelve false si la clave superó el límite
func (rl *RateLimiter) Allow(key string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	if len(rl.entries) > 10000 {
		for k, e := range rl.entries {
			if now.After(e.resetAt) {
				delete(rl.entries, k)
			}
		}
	}

	e, ok := rl.entries[key]
	if !ok || now.After(e.resetAt) {
		rl.entries[key] = &rateEntry{count: 1, resetAt: now.Add(rl.window)}
		return true
	}
	e.count++
	return e.count <= rl.limit
}

// Reset borra los intentos de una clave (por ejemplo, tras un login exitoso)
func (rl *RateLimiter) Reset(key string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	delete(rl.entries, key)
}
