package handlers

import (
	"errors"
	"log"
	"net"
	"net/http"
	"net/mail"
	"time"

	"travel-tracker-api/internal/auth"
	"travel-tracker-api/internal/middleware"
	"travel-tracker-api/internal/models"
)

var (
	// Intentos de login cada 15 minutos: 10 por email y 50 por IP
	loginLimiter   = middleware.NewRateLimiter(10, 15*time.Minute)
	loginIPLimiter = middleware.NewRateLimiter(50, 15*time.Minute)
	// 5 intentos de código MFA cada 15 minutos por usuario
	mfaLimiter = middleware.NewRateLimiter(5, 15*time.Minute)
)

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// Register maneja el registro de nuevos usuarios
func Register(w http.ResponseWriter, r *http.Request) {
	var req models.CreateUserRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	email := auth.NormalizeEmail(req.Email)
	if email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "Email and password are required")
		return
	}
	if _, err := mail.ParseAddress(email); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid email")
		return
	}
	if len(req.Password) < auth.MinPasswordLength || len(req.Password) > auth.MaxPasswordLength {
		respondError(w, http.StatusBadRequest, "Password must be between 8 and 72 characters")
		return
	}

	userID, err := auth.CreateUser(email, req.Password, req.Metadata)
	if err == auth.ErrEmailExists {
		respondError(w, http.StatusConflict, "Email already registered")
		return
	}
	if err != nil {
		log.Printf("register: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	respondJSON(w, http.StatusCreated, models.RegisterResponse{
		Success: true,
		UserID:  userID,
		Message: "User registered successfully",
	})
}

// Login valida email y contraseña. Si el usuario tiene MFA activo devuelve un
// desafío (mfa_token) en lugar de los tokens de sesión.
func Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	emailKey := "email:" + auth.NormalizeEmail(req.Email)
	ipKey := "ip:" + clientIP(r)
	if !loginLimiter.Allow(emailKey) || !loginIPLimiter.Allow(ipKey) {
		respondError(w, http.StatusTooManyRequests, "Too many login attempts, try again later")
		return
	}

	user, err := auth.CheckCredentials(req.Email, req.Password)
	switch {
	case err == auth.ErrInvalidCredentials:
		respondError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	case err == auth.ErrUserBanned:
		respondError(w, http.StatusForbidden, "User is temporarily banned")
		return
	case err != nil:
		log.Printf("login: %v", err)
		respondError(w, http.StatusInternalServerError, "Login failed")
		return
	}
	loginLimiter.Reset(emailKey)

	if user.MFAEnabled {
		mfaToken, err := auth.IssueMFAToken(user.ID, user.Email)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "Login failed")
			return
		}
		respondJSON(w, http.StatusOK, models.MFAChallengeResponse{MFARequired: true, MFAToken: mfaToken})
		return
	}

	issueTokens(w, user)
}

// VerifyMFA completa el login con un código TOTP o de recuperación
func VerifyMFA(w http.ResponseWriter, r *http.Request) {
	var req models.MFAVerifyRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	claims, err := auth.ParseMFAToken(req.MFAToken)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid or expired MFA challenge, log in again")
		return
	}

	key := "mfa:" + claims.Subject
	if !mfaLimiter.Allow(key) {
		respondError(w, http.StatusTooManyRequests, "Too many attempts, try again later")
		return
	}

	user, err := auth.GetUserByID(claims.Subject)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid or expired MFA challenge, log in again")
		return
	}

	if err := auth.VerifySecondFactor(user, req.Code); err != nil {
		if err == auth.ErrInvalidMFACode || err == auth.ErrMFANotEnabled {
			respondError(w, http.StatusUnauthorized, "Invalid code")
			return
		}
		log.Printf("mfa verify: %v", err)
		respondError(w, http.StatusInternalServerError, "MFA verification failed")
		return
	}
	mfaLimiter.Reset(key)

	issueTokens(w, user)
}

func issueTokens(w http.ResponseWriter, user *models.User) {
	resp, err := auth.IssueTokens(user)
	if err != nil {
		log.Printf("issue tokens: %v", err)
		respondError(w, http.StatusInternalServerError, "Login failed")
		return
	}
	respondJSON(w, http.StatusOK, resp)
}

// Refresh rota el refresh token y emite un access token nuevo
func Refresh(w http.ResponseWriter, r *http.Request) {
	var req models.RefreshRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.RefreshToken == "" {
		respondError(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	resp, err := auth.RotateRefreshToken(req.RefreshToken)
	switch {
	case errors.Is(err, auth.ErrInvalidToken):
		respondError(w, http.StatusUnauthorized, "Invalid or expired refresh token")
		return
	case errors.Is(err, auth.ErrUserBanned):
		respondError(w, http.StatusForbidden, "User is temporarily banned")
		return
	case err != nil:
		log.Printf("refresh: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to refresh session")
		return
	}
	respondJSON(w, http.StatusOK, resp)
}

// Logout revoca el refresh token (y toda su familia). El access token expira solo.
func Logout(w http.ResponseWriter, r *http.Request) {
	var req models.RefreshRequest
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.RefreshToken != "" {
		if err := auth.RevokeRefreshToken(req.RefreshToken); err != nil {
			log.Printf("logout: %v", err)
		}
	}
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// Me devuelve el usuario autenticado
func Me(w http.ResponseWriter, r *http.Request) {
	authUser, ok := requireUser(w, r)
	if !ok {
		return
	}
	user, err := auth.GetUserByID(authUser.ID)
	if err == auth.ErrUserNotFound {
		respondError(w, http.StatusUnauthorized, "User not found")
		return
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch user")
		return
	}
	respondJSON(w, http.StatusOK, user)
}

func loadCurrentUser(w http.ResponseWriter, r *http.Request) (*models.User, bool) {
	authUser, ok := requireUser(w, r)
	if !ok {
		return nil, false
	}
	user, err := auth.GetUserByID(authUser.ID)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "User not found")
		return nil, false
	}
	return user, true
}

// SetupMFA genera un secreto TOTP para que el usuario lo agregue a su app autenticadora
func SetupMFA(w http.ResponseWriter, r *http.Request) {
	user, ok := loadCurrentUser(w, r)
	if !ok {
		return
	}
	resp, err := auth.StartMFASetup(user)
	if err == auth.ErrMFAAlreadyEnabled {
		respondError(w, http.StatusConflict, "MFA is already enabled")
		return
	}
	if err != nil {
		log.Printf("mfa setup: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to start MFA setup")
		return
	}
	respondJSON(w, http.StatusOK, resp)
}

// EnableMFA confirma el setup con un código y devuelve los códigos de recuperación
func EnableMFA(w http.ResponseWriter, r *http.Request) {
	user, ok := loadCurrentUser(w, r)
	if !ok {
		return
	}
	var req models.MFACodeRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	key := "mfa:" + user.ID
	if !mfaLimiter.Allow(key) {
		respondError(w, http.StatusTooManyRequests, "Too many attempts, try again later")
		return
	}

	codes, err := auth.EnableMFA(user, req.Code)
	switch {
	case err == auth.ErrMFAAlreadyEnabled:
		respondError(w, http.StatusConflict, "MFA is already enabled")
		return
	case err == auth.ErrMFANotSetUp:
		respondError(w, http.StatusBadRequest, "Start the MFA setup first")
		return
	case err == auth.ErrInvalidMFACode:
		respondError(w, http.StatusBadRequest, "Invalid code")
		return
	case err != nil:
		log.Printf("mfa enable: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to enable MFA")
		return
	}
	mfaLimiter.Reset(key)
	respondJSON(w, http.StatusOK, models.MFAEnableResponse{RecoveryCodes: codes})
}

// DisableMFA desactiva MFA (requiere contraseña y un código válido)
func DisableMFA(w http.ResponseWriter, r *http.Request) {
	user, ok := loadCurrentUser(w, r)
	if !ok {
		return
	}
	var req models.MFADisableRequest
	if !decodeJSON(w, r, &req) {
		return
	}

	key := "mfa:" + user.ID
	if !mfaLimiter.Allow(key) {
		respondError(w, http.StatusTooManyRequests, "Too many attempts, try again later")
		return
	}

	err := auth.DisableMFA(user, req.Password, req.Code)
	switch {
	case err == auth.ErrMFANotEnabled:
		respondError(w, http.StatusBadRequest, "MFA is not enabled")
		return
	case err == auth.ErrInvalidCredentials:
		respondError(w, http.StatusBadRequest, "Invalid password")
		return
	case err == auth.ErrInvalidMFACode:
		respondError(w, http.StatusBadRequest, "Invalid code")
		return
	case err != nil:
		log.Printf("mfa disable: %v", err)
		respondError(w, http.StatusInternalServerError, "Failed to disable MFA")
		return
	}
	mfaLimiter.Reset(key)
	respondJSON(w, http.StatusOK, map[string]bool{"success": true})
}
