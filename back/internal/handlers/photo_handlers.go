package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strings"

	"travel-tracker-api/internal/models"

	"github.com/gorilla/mux"
)

const photoColumns = `pp.id, pp.place_id, pp.photo_url, pp.caption, pp.created_at`

func scanPhoto(row rowScanner, photo *models.PlacePhoto) error {
	return row.Scan(&photo.ID, &photo.PlaceID, &photo.PhotoURL, &photo.Caption, &photo.CreatedAt)
}

func listPhotos(w http.ResponseWriter, r *http.Request, filter string) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	id := mux.Vars(r)["id"]

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	rows, err := tx.Query(`
		SELECT `+photoColumns+`
		FROM place_photos pp
		JOIN places p ON p.id = pp.place_id
		WHERE p.user_id = $1 AND `+filter+` = $2
		ORDER BY pp.created_at ASC
	`, user.ID, id)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch photos")
		return
	}
	defer rows.Close()

	photos := []models.PlacePhoto{}
	for rows.Next() {
		var photo models.PlacePhoto
		if err := scanPhoto(rows, &photo); err != nil {
			log.Printf("scan photo: %v", err)
			respondError(w, http.StatusInternalServerError, "Failed to fetch photos")
			return
		}
		photos = append(photos, photo)
	}
	if err := rows.Err(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch photos")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, photos)
}

func GetTripPhotos(w http.ResponseWriter, r *http.Request) {
	listPhotos(w, r, "p.trip_id")
}

func GetPlacePhotos(w http.ResponseWriter, r *http.Request) {
	listPhotos(w, r, "p.id")
}

func CreatePlacePhoto(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	placeID := mux.Vars(r)["id"]

	var req models.CreatePhotoRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.Caption != nil {
		trimmed := strings.TrimSpace(*req.Caption)
		req.Caption = &trimmed
	}
	req.Caption = emptyToNil(req.Caption)
	if err := req.Validate(); err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	var photo models.PlacePhoto
	err := scanPhoto(tx.QueryRow(`
		INSERT INTO place_photos AS pp (place_id, photo_url, caption)
		SELECT p.id, $3, $4 FROM places p WHERE p.id = $1 AND p.user_id = $2
		RETURNING `+photoColumns,
		placeID, user.ID, req.PhotoURL, req.Caption), &photo)

	if err == sql.ErrNoRows {
		respondError(w, http.StatusNotFound, "Place not found")
		return
	}
	if err != nil {
		log.Printf("create photo: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to create photo")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusCreated, photo)
}

func DeletePhoto(w http.ResponseWriter, r *http.Request) {
	user, ok := requireUser(w, r)
	if !ok {
		return
	}
	photoID := mux.Vars(r)["id"]

	tx, ok := beginUserTx(w, user.ID)
	if !ok {
		return
	}
	defer tx.Rollback()

	result, err := tx.Exec(`
		DELETE FROM place_photos pp
		USING places p
		WHERE pp.id = $1 AND p.id = pp.place_id AND p.user_id = $2
	`, photoID, user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to delete photo")
		return
	}

	if n, _ := result.RowsAffected(); n == 0 {
		respondError(w, http.StatusNotFound, "Photo not found")
		return
	}

	if !commit(w, tx) {
		return
	}
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}
