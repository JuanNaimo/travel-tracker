package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
)

func TestRoutes(t *testing.T) {
	r := newRouter()
	id := "123e4567-e89b-12d3-a456-426614174000"

	matching := []struct{ method, path string }{
		{"POST", "/api/auth/register"},
		{"POST", "/api/auth/login"},
		{"POST", "/api/auth/mfa/verify"},
		{"POST", "/api/auth/refresh"},
		{"POST", "/api/auth/logout"},
		{"GET", "/api/auth/me"},
		{"POST", "/api/auth/mfa/setup"},
		{"POST", "/api/auth/mfa/enable"},
		{"POST", "/api/auth/mfa/disable"},
		{"GET", "/api/trips"},
		{"POST", "/api/trips"},
		{"GET", "/api/trips/" + id},
		{"PUT", "/api/trips/" + id},
		{"DELETE", "/api/trips/" + id},
		{"GET", "/api/trips/" + id + "/photos"},
		{"GET", "/api/places"},
		{"POST", "/api/places"},
		{"GET", "/api/places/" + id},
		{"PUT", "/api/places/" + id},
		{"DELETE", "/api/places/" + id},
		{"GET", "/api/places/" + id + "/photos"},
		{"POST", "/api/places/" + id + "/photos"},
		{"GET", "/api/photos"},
		{"DELETE", "/api/photos/" + id},
		{"GET", "/health"},
	}
	for _, tc := range matching {
		var match mux.RouteMatch
		req := httptest.NewRequest(tc.method, tc.path, nil)
		if !r.Match(req, &match) || match.MatchErr != nil {
			t.Errorf("%s %s did not match (err %v)", tc.method, tc.path, match.MatchErr)
		}
	}

	notMatching := []struct{ method, path string }{
		{"GET", "/api/trips/not-a-uuid"},
		{"DELETE", "/api/photos/1"},
		{"GET", "/api/auth/validate"},
	}
	for _, tc := range notMatching {
		var match mux.RouteMatch
		req := httptest.NewRequest(tc.method, tc.path, nil)
		if r.Match(req, &match) && match.MatchErr == nil {
			t.Errorf("%s %s should not match", tc.method, tc.path)
		}
	}
}

func TestProtectedRoutesRequireToken(t *testing.T) {
	r := newRouter()
	for _, path := range []string{"/api/trips", "/api/auth/me", "/api/places"} {
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("GET %s without token: got %d, want 401", path, rec.Code)
		}
	}
}

func TestAllowedOrigins(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "")
	if got := allowedOrigins(); len(got) != 1 || got[0] != "http://localhost:3000" {
		t.Errorf("default origins: %v", got)
	}
	t.Setenv("CORS_ALLOWED_ORIGINS", " https://a.com, https://b.com ,")
	if got := allowedOrigins(); len(got) != 2 || got[1] != "https://b.com" {
		t.Errorf("parsed origins: %v", got)
	}
}
