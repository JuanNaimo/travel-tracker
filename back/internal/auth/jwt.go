package auth

import (
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	issuer = "travel-tracker-api"

	// Audiencias: un token MFA (emitido tras validar la contraseña) nunca
	// puede usarse como access token y viceversa.
	audienceAccess = "access"
	audienceMFA    = "mfa"

	minSecretLength = 32
	mfaTokenTTL     = 5 * time.Minute
)

var ErrInvalidToken = errors.New("invalid token")

// Config contiene la configuración de JWT y refresh tokens
type Config struct {
	Secret     []byte
	AccessTTL  time.Duration
	RefreshTTL time.Duration
}

var cfg Config

// Init carga la configuración desde variables de entorno. Debe llamarse al iniciar la API.
func Init() error {
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < minSecretLength {
		return fmt.Errorf("JWT_SECRET must be set and at least %d characters long (e.g. `openssl rand -hex 32`)", minSecretLength)
	}

	accessTTL, err := durationEnv("JWT_ACCESS_TTL", 15*time.Minute)
	if err != nil {
		return err
	}
	refreshTTL, err := durationEnv("JWT_REFRESH_TTL", 30*24*time.Hour)
	if err != nil {
		return err
	}

	cfg = Config{Secret: []byte(secret), AccessTTL: accessTTL, RefreshTTL: refreshTTL}
	return nil
}

func durationEnv(key string, def time.Duration) (time.Duration, error) {
	value := os.Getenv(key)
	if value == "" {
		return def, nil
	}
	d, err := time.ParseDuration(value)
	if err != nil || d <= 0 {
		return 0, fmt.Errorf("%s must be a positive duration (e.g. 15m, 720h)", key)
	}
	return d, nil
}

// Claims son los claims de los tokens emitidos por la API
type Claims struct {
	Email string `json:"email"`
	jwt.RegisteredClaims
}

func issue(userID, email, audience string, ttl time.Duration) (string, time.Time, error) {
	now := time.Now()
	expiresAt := now.Add(ttl)
	jti, err := GenerateToken()
	if err != nil {
		return "", time.Time{}, err
	}

	claims := Claims{
		Email: email,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Subject:   userID,
			Audience:  jwt.ClaimStrings{audience},
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			ID:        jti,
		},
	}

	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(cfg.Secret)
	return signed, expiresAt, err
}

func parse(tokenString, audience string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenString, claims,
		func(t *jwt.Token) (interface{}, error) { return cfg.Secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithIssuer(issuer),
		jwt.WithAudience(audience),
		jwt.WithExpirationRequired(),
	)
	if err != nil || claims.Subject == "" {
		return nil, ErrInvalidToken
	}
	return claims, nil
}

// IssueAccessToken emite un access token de corta duración
func IssueAccessToken(userID, email string) (string, time.Time, error) {
	return issue(userID, email, audienceAccess, cfg.AccessTTL)
}

// ParseAccessToken valida un access token y devuelve sus claims
func ParseAccessToken(token string) (*Claims, error) {
	return parse(token, audienceAccess)
}

// IssueMFAToken emite un token de 5 minutos que solo sirve para completar el segundo factor
func IssueMFAToken(userID, email string) (string, error) {
	token, _, err := issue(userID, email, audienceMFA, mfaTokenTTL)
	return token, err
}

// ParseMFAToken valida un token de desafío MFA
func ParseMFAToken(token string) (*Claims, error) {
	return parse(token, audienceMFA)
}
