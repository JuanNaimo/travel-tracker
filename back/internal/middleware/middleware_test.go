package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"travel-tracker-api/internal/auth"
)

func TestRateLimiter(t *testing.T) {
	rl := NewRateLimiter(2, time.Minute)
	if !rl.Allow("k") || !rl.Allow("k") {
		t.Fatal("first two attempts should be allowed")
	}
	if rl.Allow("k") {
		t.Fatal("third attempt should be blocked")
	}
	if !rl.Allow("other") {
		t.Fatal("other keys are independent")
	}
	rl.Reset("k")
	if !rl.Allow("k") {
		t.Fatal("reset should clear attempts")
	}
}

func TestRateLimiterWindowExpires(t *testing.T) {
	rl := NewRateLimiter(1, 10*time.Millisecond)
	rl.Allow("k")
	if rl.Allow("k") {
		t.Fatal("should be blocked inside the window")
	}
	time.Sleep(15 * time.Millisecond)
	if !rl.Allow("k") {
		t.Fatal("should be allowed after the window")
	}
}

func TestAuthMiddleware(t *testing.T) {
	t.Setenv("JWT_SECRET", strings.Repeat("s", 32))
	if err := auth.Init(); err != nil {
		t.Fatal(err)
	}
	access, _, _ := auth.IssueAccessToken("user-1", "a@b.com")
	mfa, _ := auth.IssueMFAToken("user-1", "a@b.com")

	var gotUser *AuthUser
	h := AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUser, _ = GetUserFromContext(r.Context())
	}))

	cases := map[string]struct {
		header string
		want   int
	}{
		"no header":   {"", http.StatusUnauthorized},
		"not bearer":  {"Basic abc", http.StatusUnauthorized},
		"mfa token":   {"Bearer " + mfa, http.StatusUnauthorized},
		"valid token": {"Bearer " + access, http.StatusOK},
	}
	for name, tc := range cases {
		gotUser = nil
		req := httptest.NewRequest("GET", "/", nil)
		if tc.header != "" {
			req.Header.Set("Authorization", tc.header)
		}
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != tc.want {
			t.Errorf("%s: got %d, want %d", name, rec.Code, tc.want)
		}
		if tc.want == http.StatusOK && (gotUser == nil || gotUser.ID != "user-1") {
			t.Errorf("%s: user not set in context", name)
		}
	}
}
