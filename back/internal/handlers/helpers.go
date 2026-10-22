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

// respondJSON responde con un cuerpo JSON y el status indicado
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, models.ErrorResponse{Error: message})
}

// decodeJSON decodifica el cuerpo de la request; si falla responde 400 (o 413) y devuelve false
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

// requireUser obtiene el usuario autenticado; si no hay, responde 401
func requireUser(w http.ResponseWriter, r *http.Request) (*middleware.AuthUser, bool) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Unauthorized")
	}
	return user, ok
}

// beginUserTx abre una transacción con el contexto RLS del usuario. Las queries
// igualmente filtran por user_id: RLS no aplica si la API se conecta como superusuario.
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

// commit confirma la transacción; si falla responde 500 y devuelve false
func commit(w http.ResponseWriter, tx *sql.Tx) bool {
	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Database error")
		return false
	}
	return true
}

// emptyToNil convierte strings vacíos (o solo espacios) en NULL
func emptyToNil(s *string) *string {
	if s == nil || strings.TrimSpace(*s) == "" {
		return nil
	}
	return s
}
