package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"travel-tracker-api/internal/models"

	"github.com/gorilla/mux"
)

// Las fechas salen como YYYY-MM-DD: escaneadas a string, lib/pq las devuelve con hora y zona
const tripColumns = `id, user_id, name, description,
	to_char(start_date, 'YYYY-MM-DD'), to_char(end_date, 'YYYY-MM-DD'), rating, created_at, updated_at`

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func scanTrip(row rowScanner, trip *models.Trip) error {
	return row.Scan(
		&trip.ID, &trip.UserID, &trip.Name, &trip.Description,
		&trip.StartDate, &trip.EndDate, &trip.Rating,
		&trip.CreatedAt, &trip.UpdatedAt,
	)
}

func GetAllTrips(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	rows, err := tx.Query(`
		SELECT `+tripColumns+`
		FROM trips
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch trips")
		return
	}
	defer rows.Close()

	trips := []models.Trip{}
	for rows.Next() {
		var trip models.Trip
		if err := scanTrip(rows, &trip); err != nil {
			log.Printf("scan trip: %v", err)
			respondError(w, http.StatusInternalServerError, "Failed to fetch trips")
			return
		}
		trips = append(trips, trip)
	}
	if err := rows.Err(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch trips")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, trips)
}

func GetTripByID(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	tripID := mux.Vars(r)["id"]

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	var trip models.Trip
	err := scanTrip(tx.QueryRow(`
		SELECT `+tripColumns+`
		FROM trips
		WHERE id = $1 AND user_id = $2
	`, tripID, user.ID), &trip)

	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Trip not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch trip")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, trip)
}

func CreateTrip(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}

	var trip models.Trip
	if !decodeJSON(w, r, &trip) {
		return
	}
	trip.Description = emptyToNil(trip.Description)
	trip.StartDate = emptyToNil(trip.StartDate)
	trip.EndDate = emptyToNil(trip.EndDate)
	if err := trip.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	// El dueño siempre es el usuario autenticado, nunca el del cuerpo
	trip.UserID = user.ID

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	err := tx.QueryRow(`
		INSERT INTO trips (user_id, name, description, start_date, end_date, rating)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`, trip.UserID, trip.Name, trip.Description, trip.StartDate, trip.EndDate, trip.Rating).Scan(
		&trip.ID, &trip.CreatedAt, &trip.UpdatedAt,
	)
	if err != nil {
		log.Printf("create trip: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to create trip")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusCreated, trip)
}

func UpdateTrip(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	tripID := mux.Vars(r)["id"]

	var updates models.TripUpdate
	if !decodeJSON(w, r, &updates) {
		return
	}
	updates.StartDate = emptyToNil(updates.StartDate)
	updates.EndDate = emptyToNil(updates.EndDate)
	if err := updates.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	var trip models.Trip
	err := scanTrip(tx.QueryRow(`
		UPDATE trips
		SET name = COALESCE($1, name),
		    description = COALESCE($2, description),
		    start_date = COALESCE($3, start_date),
		    end_date = COALESCE($4, end_date),
		    rating = COALESCE($5, rating),
		    updated_at = NOW()
		WHERE id = $6 AND user_id = $7
		RETURNING `+tripColumns,
		updates.Name, updates.Description, updates.StartDate, updates.EndDate, updates.Rating,
		tripID, user.ID), &trip)

	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Trip not found")
		return
	}
	if err != nil {
		log.Printf("update trip: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to update trip")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, trip)
}

func DeleteTrip(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	tripID := mux.Vars(r)["id"]

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	result, err := tx.Exec("DELETE FROM trips WHERE id = $1 AND user_id = $2", tripID, user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete trip")
		return
	}

	if n, _ := result.RowsAffected(); n == 0 {
		respondError(w, http.StatusNotFound, "Trip not found")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}
