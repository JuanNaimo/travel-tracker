package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"travel-tracker-api/internal/database"
	"travel-tracker-api/internal/middleware"
	"travel-tracker-api/internal/models"
)

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, models.ErrorResponse{Error: message})
}

func decodeJSON(w http.ResponseWriter, r *http.Request, v interface{}) bool {
	err := json.NewDecoder(r.Body).Decode(v)
	if err == nil {
		return true
	}
	var maxErr *http.MaxBytesError
	if errors.As(err, &maxErr) {
		respondError(w, http.StatusRequestEntityTooLarge, "Request body too large")
		return false
	}
	respondError(w, http.StatusBadRequest, "Invalid request body")
	return false
}

func requireUser(w http.ResponseWriter, r *http.Request) (*middleware.AuthUser, bool) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
	}
	return user, ok
}

// Las queries igual filtran por user_id: RLS no aplica a superusuarios.
func beginUserTx(w http.ResponseWriter, userID string) (*sql.Tx, bool) {
	tx, err := database.DB.Begin()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Database error")
		return nil, false
	}
	if err := database.SetUserContext(tx, userID); err != nil {
		tx.Rollback()
		respondError(w, http.StatusInternalServerError, "Failed to set user context")
		return nil, false
	}
	return tx, true
}

func commit(w http.ResponseWriter, tx *sql.Tx) bool {
	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Database error")
		return false
	}
	return true
}

func emptyToNil(s *string) *string {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil
	}
	return s
}
