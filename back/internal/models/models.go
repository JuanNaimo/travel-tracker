package models

import "time"

// User representa un usuario en el sistema
type User struct {
	ID                string                 `json:"id"`
	Email             string                 `json:"email"`
	EncryptedPassword string                 `json:"-"` // No exponer en JSON
	LastSignInAt      *time.Time             `json:"last_sign_in_at,omitempty"`
	UserMetadata      map[string]interface{} `json:"user_metadata,omitempty"`
	MFAEnabled        bool                   `json:"mfa_enabled"`
	MFASecret         *string                `json:"-"`
	MFALastUsedStep   int64                  `json:"-"`
	CreatedAt         time.Time              `json:"created_at"`
	BannedUntil       *time.Time             `json:"-"`
}

// Trip representa un viaje
type Trip struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	StartDate   *string   `json:"start_date"`
	EndDate     *string   `json:"end_date"`
	Rating      *int      `json:"rating"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TripUpdate es el cuerpo de PUT /trips/{id}. Los campos nil no se modifican.
type TripUpdate struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	StartDate   *string `json:"start_date"`
	EndDate     *string `json:"end_date"`
	Rating      *int    `json:"rating"`
}

// Place representa un lugar visitado
type Place struct {
	ID          string    `json:"id"`
	TripID      string    `json:"trip_id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Category    string    `json:"category"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Rating      *int      `json:"rating"`
	VisitDate   *string   `json:"visit_date"`
	Expenses    float64   `json:"expenses"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// PlaceUpdate es el cuerpo de PUT /places/{id}. Los campos nil no se modifican.
type PlaceUpdate struct {
	Name        *string  `json:"name"`
	Description *string  `json:"description"`
	Category    *string  `json:"category"`
	Latitude    *float64 `json:"latitude"`
	Longitude   *float64 `json:"longitude"`
	Rating      *int     `json:"rating"`
	VisitDate   *string  `json:"visit_date"`
	Expenses    *float64 `json:"expenses"`
}

// PlacePhoto representa una foto asociada a un lugar
type PlacePhoto struct {
	ID        string    `json:"id"`
	PlaceID   string    `json:"place_id"`
	PhotoURL  string    `json:"photo_url"`
	Caption   *string   `json:"caption"`
	CreatedAt time.Time `json:"created_at"`
}

// CreatePhotoRequest es el cuerpo de POST /places/{id}/photos
type CreatePhotoRequest struct {
	PhotoURL string  `json:"photo_url"`
	Caption  *string `json:"caption"`
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

// TokenResponse se devuelve cuando el usuario queda autenticado
type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresAt    time.Time `json:"expires_at"`
	User         User      `json:"user"`
}

// MFAChallengeResponse se devuelve cuando el login requiere un segundo factor
type MFAChallengeResponse struct {
	MFARequired bool   `json:"mfa_required"`
	MFAToken    string `json:"mfa_token"`
}

// MFAVerifyRequest completa el login con un código TOTP o de recuperación
type MFAVerifyRequest struct {
	MFAToken string `json:"mfa_token"`
	Code     string `json:"code"`
}

// RefreshRequest se usa para rotar o revocar un refresh token
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// MFASetupResponse contiene el secreto TOTP pendiente de confirmación
type MFASetupResponse struct {
	Secret     string `json:"secret"`
	OTPAuthURL string `json:"otpauth_url"`
}

// MFACodeRequest confirma la activación de MFA
type MFACodeRequest struct {
	Code string `json:"code"`
}

// MFAEnableResponse devuelve los códigos de recuperación (se muestran una sola vez)
type MFAEnableResponse struct {
	RecoveryCodes []string `json:"recovery_codes"`
}

// MFADisableRequest requiere contraseña y un código válido
type MFADisableRequest struct {
	Password string `json:"password"`
	Code     string `json:"code"`
}

// RegisterResponse representa la respuesta del registro
type RegisterResponse struct {
	Success bool   `json:"success"`
	UserID  string `json:"userId"`
	Message string `json:"message"`
}

// ErrorResponse representa una respuesta de error
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
