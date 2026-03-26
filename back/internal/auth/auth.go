package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"time"

	"travel-tracker-api/internal/database"
	"travel-tracker-api/internal/models"

	"golang.org/x/crypto/bcrypt"
)

const (
	SessionExpiryDays      = 7
	RefreshTokenExpiryDays = 30
	BcryptCost             = 10
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound       = errors.New("user not found")
	ErrEmailExists        = errors.New("email already exists")
)

// HashPassword genera un hash bcrypt de la contraseña
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	return string(bytes), err
}

// CheckPassword verifica si la contraseña coincide con el hash
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// GenerateToken genera un token aleatorio seguro
func GenerateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// CreateUser crea un nuevo usuario en la base de datos
func CreateUser(email, password string, metadata map[string]interface{}) (string, error) {
	hashedPassword, err := HashPassword(password)
	if err != nil {
		return "", err
	}

	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		metadataJSON = []byte("{}")
	}

	var userID string
	err = database.DB.QueryRow(
		"SELECT create_user($1, $2, $3)",
		email, hashedPassword, string(metadataJSON),
	).Scan(&userID)

	if err != nil {
		if err.Error() == "pq: duplicate key value violates unique constraint \"users_email_key\"" {
			return "", ErrEmailExists
		}
		return "", err
	}

	return userID, nil
}

// GetUserByEmail obtiene un usuario por su email
func GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	var metadataJSON sql.NullString

	err := database.DB.QueryRow(`
		SELECT id, email, encrypted_password, last_sign_in_at,
		       user_metadata, created_at, banned_until
		FROM get_user_by_email($1)
	`, email).Scan(
		&user.ID, &user.Email, &user.EncryptedPassword,
		&user.LastSignInAt, &metadataJSON, &user.CreatedAt, &user.BannedUntil,
	)

	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	// Parse metadata JSON
	if metadataJSON.Valid {
		json.Unmarshal([]byte(metadataJSON.String), &user.UserMetadata)
	}

	return &user, nil
}

// CreateSession crea una nueva sesión para el usuario
func CreateSession(userID string) (*models.Session, error) {
	token, err := GenerateToken()
	if err != nil {
		return nil, err
	}

	refreshToken, err := GenerateToken()
	if err != nil {
		return nil, err
	}

	expiresAt := time.Now().Add(SessionExpiryDays * 24 * time.Hour)
	refreshExpiresAt := time.Now().Add(RefreshTokenExpiryDays * 24 * time.Hour)

	var sessionID string
	err = database.DB.QueryRow(`
		SELECT create_session($1, $2, $3, $4)
	`, userID, token, refreshToken, expiresAt).Scan(&sessionID)

	if err != nil {
		return nil, err
	}

	// Crear refresh token
	_, err = database.DB.Exec(`
		SELECT create_refresh_token($1, $2, $3)
	`, refreshToken, userID, refreshExpiresAt)

	if err != nil {
		return nil, err
	}

	session := &models.Session{
		ID:           sessionID,
		UserID:       userID,
		Token:        token,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	return session, nil
}

// ValidateSession valida un token de sesión
func ValidateSession(token string) (*models.User, bool, error) {
	var user models.User
	var isValid bool
	var metadataJSON sql.NullString

	err := database.DB.QueryRow(`
		SELECT session_id, user_id, email, user_metadata, is_valid
		FROM validate_session($1)
	`, token).Scan(
		new(string), // session_id (no lo necesitamos)
		&user.ID,
		&user.Email,
		&metadataJSON,
		&isValid,
	)

	if err == sql.ErrNoRows {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}

	// Parse metadata JSON
	if metadataJSON.Valid {
		json.Unmarshal([]byte(metadataJSON.String), &user.UserMetadata)
	}

	return &user, isValid, nil
}

// DeleteSession elimina una sesión (logout)
func DeleteSession(token string) error {
	var deleted bool
	err := database.DB.QueryRow(`
		SELECT delete_session($1)
	`, token).Scan(&deleted)

	return err
}

// Login autentica un usuario y crea una sesión
func Login(email, password string) (*models.Session, *models.User, error) {
	user, err := GetUserByEmail(email)
	if err != nil {
		if err == ErrUserNotFound {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, err
	}

	// Verificar contraseña
	if !CheckPassword(password, user.EncryptedPassword) {
		return nil, nil, ErrInvalidCredentials
	}

	// Verificar si está baneado
	if user.BannedUntil != nil && user.BannedUntil.After(time.Now()) {
		return nil, nil, errors.New("user is temporarily banned")
	}

	// Crear sesión
	session, err := CreateSession(user.ID)
	if err != nil {
		return nil, nil, err
	}

	return session, user, nil
}
