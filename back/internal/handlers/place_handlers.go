package handlers

import (
	"database/sql"
	"log"
	"net/http"

	"travel-tracker-api/internal/models"

	"github.com/gorilla/mux"
)

const placeColumns = `id, trip_id, user_id, name, description, category,
	latitude, longitude, rating, to_char(visit_date, 'YYYY-MM-DD'), expenses, created_at, updated_at`

func scanPlace(row rowScanner, place *models.Place) error {
	return row.Scan(
		&place.ID, &place.TripID, &place.UserID, &place.Name, &place.Description,
		&place.Category, &place.Latitude, &place.Longitude, &place.Rating,
		&place.VisitDate, &place.Expenses, &place.CreatedAt, &place.UpdatedAt,
	)
}

func GetAllPlaces(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}

	tripID := r.URL.Query().Get("trip_id")
	if tripID != "" && !models.IsUUID(tripID) {
		respondError(w, http.StatusBadRequest, "Invalid trip_id")
		return
	}

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	rows, err := tx.Query(`
		SELECT `+placeColumns+`
		FROM places
		WHERE user_id = $1 AND ($2 = '' OR trip_id::text = $2)
		ORDER BY created_at DESC
	`, user.ID, tripID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch places")
		return
	}
	defer rows.Close()

	places := []models.Place{}
	for rows.Next() {
		var place models.Place
		if err := scanPlace(rows, &place); err != nil {
			log.Printf("scan place: %v", err)
			respondError(w, http.StatusInternalServerError, "Failed to fetch places")
			return
		}
		places = append(places, place)
	}
	if err := rows.Err(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch places")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, places)
}

func GetPlaceByID(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	placeID := mux.Vars(r)["id"]

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	var place models.Place
	err := scanPlace(tx.QueryRow(`
		SELECT `+placeColumns+`
		FROM places
		WHERE id = $1 AND user_id = $2
	`, placeID, user.ID), &place)

	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Place not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch place")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, place)
}

func CreatePlace(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}

	var place models.Place
	if !decodeJSON(w, r, &place) {
		return
	}
	if place.Category == "" {
		place.Category = "otros"
	}
	place.Description = emptyToNil(place.Description)
	place.VisitDate = emptyToNil(place.VisitDate)
	if err := place.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	place.UserID = user.ID

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	var exists bool
	if err := tx.QueryRow(
		`SELECT EXISTS (SELECT 1 FROM trips WHERE id = $1 AND user_id = $2)`,
		place.TripID, user.ID,
	).Scan(&exists); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create place")
		return
	}
	if !exists {
		respondError(w, http.StatusNotFound, "Trip not found")
		return
	}

	err := tx.QueryRow(`
		INSERT INTO places (trip_id, user_id, name, description, category, latitude, longitude, rating, visit_date, expenses)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at
	`, place.TripID, place.UserID, place.Name, place.Description, place.Category,
		place.Latitude, place.Longitude, place.Rating, place.VisitDate, place.Expenses).Scan(
		&place.ID, &place.CreatedAt, &place.UpdatedAt,
	)
	if err != nil {
		log.Printf("create place: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to create place")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusCreated, place)
}

func UpdatePlace(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	placeID := mux.Vars(r)["id"]

	var updates models.PlaceUpdate
	if !decodeJSON(w, r, &updates) {
		return
	}
	updates.VisitDate = emptyToNil(updates.VisitDate)
	if err := updates.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	var place models.Place
	err := scanPlace(tx.QueryRow(`
		UPDATE places
		SET name = COALESCE($1, name),
		    description = COALESCE($2, description),
		    category = COALESCE($3, category),
		    latitude = COALESCE($4, latitude),
		    longitude = COALESCE($5, longitude),
		    rating = COALESCE($6, rating),
		    visit_date = COALESCE($7, visit_date),
		    expenses = COALESCE($8, expenses),
		    updated_at = NOW()
		WHERE id = $9 AND user_id = $10
		RETURNING `+placeColumns,
		updates.Name, updates.Description, updates.Category, updates.Latitude, updates.Longitude,
		updates.Rating, updates.VisitDate, updates.Expenses, placeID, user.ID), &place)

	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Place not found")
		return
	}
	if err != nil {
		log.Printf("update place: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to update place")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, place)
}

func DeletePlace(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	placeID := mux.Vars(r)["id"]

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	result, err := tx.Exec("DELETE FROM places WHERE id = $1 AND user_id = $2", placeID, user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete place")
		return
	}

	if n, _ := result.RowsAffected(); n == 0 {
		respondError(w, http.StatusNotFound, "Place not found")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}
