package handlers

import (
	"encoding/json"
	"net/http"

	"travel-tracker-api/internal/auth"
	"travel-tracker-api/internal/middleware"
	"travel-tracker-api/internal/models"
)

// Register maneja el registro de nuevos usuarios
func Register(w http.ResponseWriter, r *http.Request) {
	var req models.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid request body",
		})
		return
	}

	// Validaciones
	if req.Email == "" || req.Password == "" {
		respondJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Error: "Email and password are required",
		})
		return
	}

	// Crear usuario
	userID, err := auth.CreateUser(req.Email, req.Password, req.Metadata)
	if err != nil {
		if err == auth.ErrEmailExists {
			respondJSON(w, http.StatusConflict, models.ErrorResponse{
				Error: "Email already registered",
			})
			return
		}
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{
			Error: "Failed to create user",
		})
		return
	}

	respondJSON(w, http.StatusCreated, models.RegisterResponse{
		Success: true,
		UserID:  userID,
		Message: "User registered successfully",
	})
}

// Login maneja el inicio de sesión
func Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, models.ErrorResponse{
			Error: "Invalid request body",
		})
		return
	}

	// Autenticar
	session, user, err := auth.Login(req.Email, req.Password)
	if err != nil {
		if err == auth.ErrInvalidCredentials {
			respondJSON(w, http.StatusUnauthorized, models.ErrorResponse{
				Error: "Invalid email or password",
			})
			return
		}
		respondJSON(w, http.StatusInternalServerError, models.ErrorResponse{
			Error: "Login failed",
		})
		return
	}

	respondJSON(w, http.StatusOK, models.LoginResponse{
		Success:      true,
		SessionToken: session.Token,
		RefreshToken: session.RefreshToken,
		ExpiresAt:    session.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
		User:         *user,
	})
}

// Logout maneja el cierre de sesión
func Logout(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		respondJSON(w, http.StatusOK, map[string]bool{"success": true})
		return
	}

	// Extraer token
	token := ""
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	if token != "" {
		auth.DeleteSession(token)
	}

	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// ValidateSession valida una sesión activa
func ValidateSession(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, models.ValidateSessionResponse{
			Valid: false,
		})
		return
	}

	respondJSON(w, http.StatusOK, models.ValidateSessionResponse{
		Valid: true,
		User:  *user,
	})
}

// Helper function para responder con JSON
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
