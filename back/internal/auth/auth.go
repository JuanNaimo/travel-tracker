package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"travel-tracker-api/internal/database"
	"travel-tracker-api/internal/models"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

const (
	BcryptCost        = 12
	MinPasswordLength = 8
	// bcrypt ignora todo lo que exceda 72 bytes
	MaxPasswordLength = 72

	recoveryCodeCount = 10
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserNotFound       = errors.New("user not found")
	ErrEmailExists        = errors.New("email already exists")
	ErrUserBanned         = errors.New("user is temporarily banned")
	ErrInvalidMFACode     = errors.New("invalid MFA code")
	ErrMFAAlreadyEnabled  = errors.New("MFA is already enabled")
	ErrMFANotEnabled      = errors.New("MFA is not enabled")
	ErrMFANotSetUp        = errors.New("MFA setup has not been started")
)

// dummyHash se compara cuando el email no existe, para que la respuesta tarde
// lo mismo y no permita enumerar usuarios por tiempo de respuesta.
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("dummy-password-for-timing"), BcryptCost)

// NormalizeEmail normaliza un email para guardarlo y buscarlo
func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// HashPassword genera un hash bcrypt de la contraseña
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	return string(bytes), err
}

// CheckPassword verifica si la contraseña coincide con el hash
func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// GenerateToken genera un token aleatorio seguro (256 bits, hex)
func GenerateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// hashToken devuelve el SHA-256 de un token aleatorio. No hace falta bcrypt
// porque los tokens tienen alta entropía; solo evitamos guardarlos en claro.
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// CreateUser crea un nuevo usuario en la base de datos
func CreateUser(email, password string, metadata map[string]interface{}) (string, error) {
	hashedPassword, err := HashPassword(password)
	if err != nil {
		return "", err
	}

	if metadata == nil {
		metadata = map[string]interface{}{}
	}
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return "", err
	}

	var userID string
	err = database.DB.QueryRow(`
		INSERT INTO users (email, encrypted_password, user_metadata)
		VALUES ($1, $2, $3)
		RETURNING id
	`, NormalizeEmail(email), hashedPassword, string(metadataJSON)).Scan(&userID)

	var pqErr *pq.Error
	if errors.As(err, &pqErr) && pqErr.Code == "23505" { // unique_violation
		return "", ErrEmailExists
	}
	if err != nil {
		return "", err
	}
	return userID, nil
}

const userColumns = `id, email, encrypted_password, last_sign_in_at, user_metadata,
	mfa_enabled, mfa_secret, mfa_last_used_step, created_at, banned_until`

func scanUser(row *sql.Row) (*models.User, error) {
	var user models.User
	var metadataJSON sql.NullString
	err := row.Scan(
		&user.ID, &user.Email, &user.EncryptedPassword, &user.LastSignInAt, &metadataJSON,
		&user.MFAEnabled, &user.MFASecret, &user.MFALastUsedStep, &user.CreatedAt, &user.BannedUntil,
	)
	if err == sql.ErrNoRows {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	if metadataJSON.Valid {
		json.Unmarshal([]byte(metadataJSON.String), &user.UserMetadata)
	}
	return &user, nil
}

// GetUserByEmail obtiene un usuario activo por su email
func GetUserByEmail(email string) (*models.User, error) {
	return scanUser(database.DB.QueryRow(
		`SELECT `+userColumns+` FROM users WHERE email = $1 AND deleted_at IS NULL`,
		NormalizeEmail(email),
	))
}

// GetUserByID obtiene un usuario activo por su ID
func GetUserByID(id string) (*models.User, error) {
	return scanUser(database.DB.QueryRow(
		`SELECT `+userColumns+` FROM users WHERE id = $1 AND deleted_at IS NULL`, id,
	))
}

func isBanned(user *models.User) bool {
	return user.BannedUntil != nil && user.BannedUntil.After(time.Now())
}

// CheckCredentials valida email y contraseña (primer factor)
func CheckCredentials(email, password string) (*models.User, error) {
	user, err := GetUserByEmail(email)
	if err == ErrUserNotFound {
		bcrypt.CompareHashAndPassword(dummyHash, []byte(password))
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}

	if !CheckPassword(password, user.EncryptedPassword) {
		return nil, ErrInvalidCredentials
	}
	if isBanned(user) {
		return nil, ErrUserBanned
	}
	return user, nil
}

// IssueTokens emite un access token y un refresh token nuevo (nueva familia).
// Se llama cuando el usuario completó todos los factores requeridos.
func IssueTokens(user *models.User) (*models.TokenResponse, error) {
	if _, err := database.DB.Exec(`UPDATE users SET last_sign_in_at = NOW() WHERE id = $1`, user.ID); err != nil {
		return nil, err
	}
	familyID, err := newUUID()
	if err != nil {
		return nil, err
	}
	return issueTokenPair(database.DB, user, familyID)
}

type execer interface {
	Exec(query string, args ...interface{}) (sql.Result, error)
}

func issueTokenPair(db execer, user *models.User, familyID string) (*models.TokenResponse, error) {
	accessToken, expiresAt, err := IssueAccessToken(user.ID, user.Email)
	if err != nil {
		return nil, err
	}
	refreshToken, err := GenerateToken()
	if err != nil {
		return nil, err
	}

	_, err = db.Exec(`
		INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
		VALUES ($1, $2, $3, $4)
	`, user.ID, hashToken(refreshToken), familyID, time.Now().Add(cfg.RefreshTTL))
	if err != nil {
		return nil, err
	}

	return &models.TokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresAt:    expiresAt,
		User:         *user,
	}, nil
}

// RotateRefreshToken canjea un refresh token por un par nuevo. Si el token ya
// fue usado (posible robo), revoca todos los tokens de esa familia.
func RotateRefreshToken(refreshToken string) (*models.TokenResponse, error) {
	tx, err := database.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var tokenID, userID, familyID string
	var revoked bool
	var expiresAt time.Time
	err = tx.QueryRow(`
		SELECT id, user_id, family_id, revoked, expires_at
		FROM refresh_tokens
		WHERE token_hash = $1
		FOR UPDATE
	`, hashToken(refreshToken)).Scan(&tokenID, &userID, &familyID, &revoked, &expiresAt)
	if err == sql.ErrNoRows {
		return nil, ErrInvalidToken
	}
	if err != nil {
		return nil, err
	}

	if revoked {
		// Reutilización de un token ya rotado: invalidar la sesión completa
		if _, err := tx.Exec(`UPDATE refresh_tokens SET revoked = TRUE WHERE family_id = $1`, familyID); err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return nil, ErrInvalidToken
	}
	if expiresAt.Before(time.Now()) {
		return nil, ErrInvalidToken
	}

	user, err := GetUserByID(userID)
	if err == ErrUserNotFound {
		return nil, ErrInvalidToken
	}
	if err != nil {
		return nil, err
	}
	if isBanned(user) {
		return nil, ErrUserBanned
	}

	if _, err := tx.Exec(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, tokenID); err != nil {
		return nil, err
	}
	resp, err := issueTokenPair(tx, user, familyID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return resp, nil
}

// RevokeRefreshToken revoca la sesión (familia) a la que pertenece el token (logout)
func RevokeRefreshToken(refreshToken string) error {
	_, err := database.DB.Exec(`
		UPDATE refresh_tokens SET revoked = TRUE
		WHERE family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = $1)
	`, hashToken(refreshToken))
	return err
}

// RevokeAllRefreshTokens cierra todas las sesiones del usuario
func RevokeAllRefreshTokens(userID string) error {
	_, err := database.DB.Exec(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, userID)
	return err
}

// VerifySecondFactor valida un código TOTP o, si no lo es, un código de recuperación
func VerifySecondFactor(user *models.User, code string) error {
	if !user.MFAEnabled || user.MFASecret == nil {
		return ErrMFANotEnabled
	}

	if step, ok := ValidateTOTP(*user.MFASecret, code, time.Now(), user.MFALastUsedStep); ok {
		// La condición en el WHERE evita que dos requests concurrentes usen el mismo código
		res, err := database.DB.Exec(`
			UPDATE users SET mfa_last_used_step = $1
			WHERE id = $2 AND mfa_last_used_step < $1
		`, step, user.ID)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrInvalidMFACode
		}
		return nil
	}

	return useRecoveryCode(user.ID, code)
}

func normalizeRecoveryCode(code string) string {
	return strings.ToLower(strings.ReplaceAll(strings.TrimSpace(code), "-", ""))
}

func useRecoveryCode(userID, code string) error {
	normalized := normalizeRecoveryCode(code)
	if normalized == "" {
		return ErrInvalidMFACode
	}
	res, err := database.DB.Exec(`
		UPDATE mfa_recovery_codes SET used_at = NOW()
		WHERE user_id = $1 AND code_hash = $2 AND used_at IS NULL
	`, userID, hashToken(normalized))
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrInvalidMFACode
	}
	return nil
}

// StartMFASetup genera un secreto TOTP nuevo y lo deja pendiente de confirmación
func StartMFASetup(user *models.User) (*models.MFASetupResponse, error) {
	if user.MFAEnabled {
		return nil, ErrMFAAlreadyEnabled
	}
	secret, err := GenerateTOTPSecret()
	if err != nil {
		return nil, err
	}
	if _, err := database.DB.Exec(`
		UPDATE users SET mfa_secret = $1, mfa_last_used_step = 0 WHERE id = $2 AND mfa_enabled = FALSE
	`, secret, user.ID); err != nil {
		return nil, err
	}
	return &models.MFASetupResponse{
		Secret:     secret,
		OTPAuthURL: TOTPProvisioningURI(secret, user.Email),
	}, nil
}

// EnableMFA confirma el setup con un código válido y genera códigos de recuperación
func EnableMFA(user *models.User, code string) ([]string, error) {
	if user.MFAEnabled {
		return nil, ErrMFAAlreadyEnabled
	}
	if user.MFASecret == nil {
		return nil, ErrMFANotSetUp
	}
	step, ok := ValidateTOTP(*user.MFASecret, code, time.Now(), user.MFALastUsedStep)
	if !ok {
		return nil, ErrInvalidMFACode
	}

	codes, err := generateRecoveryCodes()
	if err != nil {
		return nil, err
	}

	tx, err := database.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`
		UPDATE users SET mfa_enabled = TRUE, mfa_last_used_step = $1 WHERE id = $2
	`, step, user.ID); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`DELETE FROM mfa_recovery_codes WHERE user_id = $1`, user.ID); err != nil {
		return nil, err
	}
	for _, c := range codes {
		if _, err := tx.Exec(`
			INSERT INTO mfa_recovery_codes (user_id, code_hash) VALUES ($1, $2)
		`, user.ID, hashToken(normalizeRecoveryCode(c))); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return codes, nil
}

// DisableMFA desactiva MFA tras verificar contraseña y segundo factor
func DisableMFA(user *models.User, password, code string) error {
	if !user.MFAEnabled {
		return ErrMFANotEnabled
	}
	if !CheckPassword(password, user.EncryptedPassword) {
		return ErrInvalidCredentials
	}
	if err := VerifySecondFactor(user, code); err != nil {
		return err
	}

	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`
		UPDATE users SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_last_used_step = 0 WHERE id = $1
	`, user.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM mfa_recovery_codes WHERE user_id = $1`, user.ID); err != nil {
		return err
	}
	return tx.Commit()
}

// generateRecoveryCodes genera códigos con formato xxxxx-xxxxx (40 bits cada uno)
func generateRecoveryCodes() ([]string, error) {
	codes := make([]string, recoveryCodeCount)
	for i := range codes {
		raw := make([]byte, 5)
		if _, err := rand.Read(raw); err != nil {
			return nil, err
		}
		h := hex.EncodeToString(raw)
		codes[i] = h[:5] + "-" + h[5:]
	}
	return codes, nil
}

func newUUID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	b[6] = (b[6] & 0x0f) | 0x40 // versión 4
	b[8] = (b[8] & 0x3f) | 0x80 // variante RFC 4122
	h := hex.EncodeToString(b)
	return h[0:8] + "-" + h[8:12] + "-" + h[12:16] + "-" + h[16:20] + "-" + h[20:], nil
}
