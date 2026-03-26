package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"travel-tracker-api/internal/database"
	"travel-tracker-api/internal/middleware"
	"travel-tracker-api/internal/models"

	"github.com/gorilla/mux"
)

// GetAllTrips obtiene todos los viajes del usuario
func GetAllTrips(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Database error"})
		return
	}
	defer tx.Rollback()

	// Configurar contexto de usuario para RLS
	if err := database.SetUserContext(tx, user.ID); err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to set user context"})
		return
	}

	rows, err := tx.Query(`
		SELECT id, user_id, name, description, start_date, end_date, rating, created_at, updated_at
		FROM trips
		ORDER BY created_at DESC
	`)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to fetch trips"})
		return
	}
	defer rows.Close()

	var trips []models.Trip
	for rows.Next() {
		var trip models.Trip
		err := rows.Scan(
			&trip.ID, &trip.UserID, &trip.Name, &trip.Description,
			&trip.StartDate, &trip.EndDate, &trip.Rating,
			&trip.CreatedAt, &trip.UpdatedAt,
		)
		if err != nil {
			continue
		}
		trips = append(trips, trip)
	}

	tx.Commit()
	respondJSON(w, http.StatusOK, trips)
}

// GetTripByID obtiene un viaje por su ID
func GetTripByID(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	vars := mux.Vars(r)
	tripID := vars["id"]

	tx, err := database.DB.Begin()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Database error"})
		return
	}
	defer tx.Rollback()

	if err := database.SetUserContext(tx, user.ID); err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to set user context"})
		return
	}

	var trip models.Trip
	err = tx.QueryRow(`
		SELECT id, user_id, name, description, start_date, end_date, rating, created_at, updated_at
		FROM trips
		WHERE id = $1
	`, tripID).Scan(
		&trip.ID, &trip.UserID, &trip.Name, &trip.Description,
		&trip.StartDate, &trip.EndDate, &trip.Rating,
		&trip.CreatedAt, &trip.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		respondJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Trip not found"})
		return
	}
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to fetch trip"})
		return
	}

	tx.Commit()
	respondJSON(w, http.StatusOK, trip)
}

// CreateTrip crea un nuevo viaje
func CreateTrip(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var trip models.Trip
	if err := json.NewDecoder(r.Body).Decode(&trip); err != nil {
		respondJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Asegurar que el user_id es el del usuario autenticado
	trip.UserID = user.ID

	tx, err := database.DB.Begin()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Database error"})
		return
	}
	defer tx.Rollback()

	if err := database.SetUserContext(tx, user.ID); err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to set user context"})
		return
	}

	err = tx.QueryRow(`
		INSERT INTO trips (user_id, name, description, start_date, end_date, rating)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`, trip.UserID, trip.Name, trip.Description, trip.StartDate, trip.EndDate, trip.Rating).Scan(
		&trip.ID, &trip.CreatedAt, &trip.UpdatedAt,
	)

	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create trip"})
		return
	}

	tx.Commit()
	respondJSON(w, http.StatusCreated, trip)
}

// UpdateTrip actualiza un viaje existente
func UpdateTrip(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	vars := mux.Vars(r)
	tripID := vars["id"]

	var updates models.Trip
	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		respondJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Database error"})
		return
	}
	defer tx.Rollback()

	if err := database.SetUserContext(tx, user.ID); err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to set user context"})
		return
	}

	var trip models.Trip
	err = tx.QueryRow(`
		UPDATE trips
		SET name = COALESCE($1, name),
		    description = COALESCE($2, description),
		    start_date = COALESCE($3, start_date),
		    end_date = COALESCE($4, end_date),
		    rating = COALESCE($5, rating),
		    updated_at = NOW()
		WHERE id = $6
		RETURNING id, user_id, name, description, start_date, end_date, rating, created_at, updated_at
	`, updates.Name, updates.Description, updates.StartDate, updates.EndDate, updates.Rating, tripID).Scan(
		&trip.ID, &trip.UserID, &trip.Name, &trip.Description,
		&trip.StartDate, &trip.EndDate, &trip.Rating,
		&trip.CreatedAt, &trip.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		respondJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Trip not found"})
		return
	}
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update trip"})
		return
	}

	tx.Commit()
	respondJSON(w, http.StatusOK, trip)
}

// DeleteTrip elimina un viaje
func DeleteTrip(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	vars := mux.Vars(r)
	tripID := vars["id"]

	tx, err := database.DB.Begin()
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Database error"})
		return
	}
	defer tx.Rollback()

	if err := database.SetUserContext(tx, user.ID); err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to set user context"})
		return
	}

	result, err := tx.Exec("DELETE FROM trips WHERE id = $1", tripID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to delete trip"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		respondJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Trip not found"})
		return
	}

	tx.Commit()
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}
