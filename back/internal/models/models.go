package models

import "time"

// User representa un usuario en el sistema
type User struct {
	ID                string                 `json:"id"`
	Email             string                 `json:"email"`
	EncryptedPassword string                 `json:"-"` // No exponer en JSON
	LastSignInAt      *time.Time             `json:"last_sign_in_at,omitempty"`
	UserMetadata      map[string]interface{} `json:"user_metadata,omitempty"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
	BannedUntil       *time.Time             `json:"-"`
	DeletedAt         *time.Time             `json:"-"`
}

// Session representa una sesión de usuario
type Session struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	Token        string    `json:"token"`
	RefreshToken string    `json:"refresh_token"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// Trip representa un viaje
type Trip struct {
	ID          string     `json:"id"`
	UserID      string     `json:"user_id"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	StartDate   *string    `json:"start_date"`
	EndDate     *string    `json:"end_date"`
	Rating      *int       `json:"rating"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// Place representa un lugar visitado
type Place struct {
	ID          string     `json:"id"`
	TripID      string     `json:"trip_id"`
	UserID      string     `json:"user_id"`
	Name        string     `json:"name"`
	Description *string    `json:"description"`
	Category    string     `json:"category"`
	Latitude    float64    `json:"latitude"`
	Longitude   float64    `json:"longitude"`
	Rating      *int       `json:"rating"`
	VisitDate   *string    `json:"visit_date"`
	Expenses    float64    `json:"expenses"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// CreateUserRequest representa la petición para crear un usuario
type CreateUserRequest struct {
	Email    string                 `json:"email"`
	Password string                 `json:"password"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// LoginRequest representa la petición de login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse representa la respuesta del login
type LoginResponse struct {
	Success      bool   `json:"success"`
	SessionToken string `json:"sessionToken"`
	RefreshToken string `json:"refreshToken,omitempty"`
	ExpiresAt    string `json:"expiresAt"`
	User         User   `json:"user"`
}

// RegisterResponse representa la respuesta del registro
type RegisterResponse struct {
	Success bool   `json:"success"`
	UserID  string `json:"userId"`
	Message string `json:"message"`
}

// ValidateSessionResponse representa la respuesta de validación de sesión
type ValidateSessionResponse struct {
	Valid bool `json:"valid"`
	User  User `json:"user"`
}

// ErrorResponse representa una respuesta de error
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
