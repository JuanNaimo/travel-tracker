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

// GetAllPlaces obtiene todos los lugares del usuario
func GetAllPlaces(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	tripID := r.URL.Query().Get("trip_id")

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

	var rows *sql.Rows
	if tripID != "" {
		rows, err = tx.Query(`
			SELECT id, trip_id, user_id, name, description, category,
			       latitude, longitude, rating, visit_date, expenses, created_at, updated_at
			FROM places
			WHERE trip_id = $1
			ORDER BY created_at DESC
		`, tripID)
	} else {
		rows, err = tx.Query(`
			SELECT id, trip_id, user_id, name, description, category,
			       latitude, longitude, rating, visit_date, expenses, created_at, updated_at
			FROM places
			ORDER BY created_at DESC
		`)
	}

	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to fetch places"})
		return
	}
	defer rows.Close()

	var places []models.Place
	for rows.Next() {
		var place models.Place
		err := rows.Scan(
			&place.ID, &place.TripID, &place.UserID, &place.Name, &place.Description,
			&place.Category, &place.Latitude, &place.Longitude, &place.Rating,
			&place.VisitDate, &place.Expenses, &place.CreatedAt, &place.UpdatedAt,
		)
		if err != nil {
			continue
		}
		places = append(places, place)
	}

	tx.Commit()
	respondJSON(w, http.StatusOK, places)
}

// GetPlaceByID obtiene un lugar por su ID
func GetPlaceByID(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	vars := mux.Vars(r)
	placeID := vars["id"]

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

	var place models.Place
	err = tx.QueryRow(`
		SELECT id, trip_id, user_id, name, description, category,
		       latitude, longitude, rating, visit_date, expenses, created_at, updated_at
		FROM places
		WHERE id = $1
	`, placeID).Scan(
		&place.ID, &place.TripID, &place.UserID, &place.Name, &place.Description,
		&place.Category, &place.Latitude, &place.Longitude, &place.Rating,
		&place.VisitDate, &place.Expenses, &place.CreatedAt, &place.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		respondJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Place not found"})
		return
	}
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to fetch place"})
		return
	}

	tx.Commit()
	respondJSON(w, http.StatusOK, place)
}

// CreatePlace crea un nuevo lugar
func CreatePlace(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	var place models.Place
	if err := json.NewDecoder(r.Body).Decode(&place); err != nil {
		respondJSON(w, http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Asegurar que el user_id es el del usuario autenticado
	place.UserID = user.ID

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
		INSERT INTO places (trip_id, user_id, name, description, category, latitude, longitude, rating, visit_date, expenses)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at
	`, place.TripID, place.UserID, place.Name, place.Description, place.Category,
		place.Latitude, place.Longitude, place.Rating, place.VisitDate, place.Expenses).Scan(
		&place.ID, &place.CreatedAt, &place.UpdatedAt,
	)

	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create place"})
		return
	}

	tx.Commit()
	respondJSON(w, http.StatusCreated, place)
}

// UpdatePlace actualiza un lugar existente
func UpdatePlace(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	vars := mux.Vars(r)
	placeID := vars["id"]

	var updates models.Place
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

	var place models.Place
	err = tx.QueryRow(`
		UPDATE places
		SET name = COALESCE(NULLIF($1, ''), name),
		    description = COALESCE($2, description),
		    category = COALESCE(NULLIF($3, ''), category),
		    latitude = COALESCE(NULLIF($4, 0), latitude),
		    longitude = COALESCE(NULLIF($5, 0), longitude),
		    rating = COALESCE($6, rating),
		    visit_date = COALESCE($7, visit_date),
		    expenses = COALESCE(NULLIF($8, 0), expenses),
		    updated_at = NOW()
		WHERE id = $9
		RETURNING id, trip_id, user_id, name, description, category,
		          latitude, longitude, rating, visit_date, expenses, created_at, updated_at
	`, updates.Name, updates.Description, updates.Category, updates.Latitude, updates.Longitude,
		updates.Rating, updates.VisitDate, updates.Expenses, placeID).Scan(
		&place.ID, &place.TripID, &place.UserID, &place.Name, &place.Description,
		&place.Category, &place.Latitude, &place.Longitude, &place.Rating,
		&place.VisitDate, &place.Expenses, &place.CreatedAt, &place.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		respondJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Place not found"})
		return
	}
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to update place"})
		return
	}

	tx.Commit()
	respondJSON(w, http.StatusOK, place)
}

// DeletePlace elimina un lugar
func DeletePlace(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{Error: "Unauthorized"})
		return
	}

	vars := mux.Vars(r)
	placeID := vars["id"]

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

	result, err := tx.Exec("DELETE FROM places WHERE id = $1", placeID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to delete place"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		respondJSON(w, http.StatusNotFound, models.ErrorResponse{Error: "Place not found"})
		return
	}

	tx.Commit()
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}
