package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func setupConfig(t *testing.T) {
	t.Helper()
	t.Setenv("JWT_SECRET", strings.Repeat("s", 32))
	t.Setenv("JWT_ACCESS_TTL", "")
	t.Setenv("JWT_REFRESH_TTL", "")
	if err := Init(); err != nil {
		t.Fatalf("Init: %v", err)
	}
}

func TestInitRequiresStrongSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "short")
	if err := Init(); err == nil {
		t.Fatal("expected error for short secret")
	}
}

func TestInitRejectsInvalidTTL(t *testing.T) {
	t.Setenv("JWT_SECRET", strings.Repeat("s", 32))
	t.Setenv("JWT_ACCESS_TTL", "nope")
	if err := Init(); err == nil {
		t.Fatal("expected error for invalid JWT_ACCESS_TTL")
	}
}

func TestAccessTokenRoundTrip(t *testing.T) {
	setupConfig(t)

	token, expiresAt, err := IssueAccessToken("user-1", "a@b.com")
	if err != nil {
		t.Fatal(err)
	}
	if time.Until(expiresAt) > 15*time.Minute || time.Until(expiresAt) < 14*time.Minute {
		t.Fatalf("unexpected expiry %v", expiresAt)
	}

	claims, err := ParseAccessToken(token)
	if err != nil {
		t.Fatalf("ParseAccessToken: %v", err)
	}
	if claims.Subject != "user-1" || claims.Email != "a@b.com" {
		t.Fatalf("unexpected claims %+v", claims)
	}
}

func TestMFATokenIsNotAnAccessToken(t *testing.T) {
	setupConfig(t)

	mfaToken, err := IssueMFAToken("user-1", "a@b.com")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := ParseAccessToken(mfaToken); err == nil {
		t.Fatal("MFA token must not be accepted as access token")
	}
	if _, err := ParseMFAToken(mfaToken); err != nil {
		t.Fatalf("ParseMFAToken: %v", err)
	}

	accessToken, _, _ := IssueAccessToken("user-1", "a@b.com")
	if _, err := ParseMFAToken(accessToken); err == nil {
		t.Fatal("access token must not be accepted as MFA token")
	}
}

func TestRejectsTamperedAndForeignTokens(t *testing.T) {
	setupConfig(t)
	token, _, _ := IssueAccessToken("user-1", "a@b.com")

	// Firma de otro secreto
	other := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer: issuer, Subject: "user-1", Audience: jwt.ClaimStrings{audienceAccess},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	})
	foreign, _ := other.SignedString([]byte(strings.Repeat("x", 32)))

	// Algoritmo "none"
	none := jwt.NewWithClaims(jwt.SigningMethodNone, Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer: issuer, Subject: "user-1", Audience: jwt.ClaimStrings{audienceAccess},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	})
	noneToken, _ := none.SignedString(jwt.UnsafeAllowNoneSignatureType)

	// Expirado
	expired := jwt.NewWithClaims(jwt.SigningMethodHS256, Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer: issuer, Subject: "user-1", Audience: jwt.ClaimStrings{audienceAccess},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Minute)),
		},
	})
	expiredToken, _ := expired.SignedString(cfg.Secret)

	for name, tok := range map[string]string{
		"tampered": token[:len(token)-2] + "xx",
		"foreign":  foreign,
		"none":     noneToken,
		"expired":  expiredToken,
		"garbage":  "not-a-jwt",
	} {
		if _, err := ParseAccessToken(tok); err == nil {
			t.Errorf("%s token was accepted", name)
		}
	}
}

// Vectores de RFC 6238 (apéndice B, SHA1). El RFC usa 8 dígitos; con 6 dígitos
// el código son los últimos 6.
func TestTOTPRFCVectors(t *testing.T) {
	key := []byte("12345678901234567890")
	vectors := map[int64]string{
		59:          "287082",
		1111111109:  "081804",
		1111111111:  "050471",
		1234567890:  "005924",
		2000000000:  "279037",
		20000000000: "353130",
	}
	for unix, want := range vectors {
		if got := totpCode(key, unix/totpPeriod); got != want {
			t.Errorf("t=%d: got %s, want %s", unix, got, want)
		}
	}
}

func TestValidateTOTP(t *testing.T) {
	secret, err := GenerateTOTPSecret()
	if err != nil {
		t.Fatal(err)
	}
	key, _ := b32.DecodeString(secret)
	now := time.Unix(1_700_000_000, 0)
	step := now.Unix() / totpPeriod

	if got, ok := ValidateTOTP(secret, totpCode(key, step), now, 0); !ok || got != step {
		t.Fatalf("current code rejected (step %d ok %v)", got, ok)
	}
	if _, ok := ValidateTOTP(secret, totpCode(key, step-1), now, 0); !ok {
		t.Fatal("previous-period code should be accepted (clock skew)")
	}
	if _, ok := ValidateTOTP(secret, totpCode(key, step-2), now, 0); ok {
		t.Fatal("code two periods old should be rejected")
	}
	if _, ok := ValidateTOTP(secret, totpCode(key, step), now, step); ok {
		t.Fatal("reused code should be rejected")
	}
	if _, ok := ValidateTOTP(secret, "12345", now, 0); ok {
		t.Fatal("short code should be rejected")
	}
}

func TestProvisioningURI(t *testing.T) {
	uri := TOTPProvisioningURI("ABC", "a@b.com")
	if !strings.HasPrefix(uri, "otpauth://totp/Travel%20Tracker:a@b.com?") {
		t.Fatalf("unexpected uri %s", uri)
	}
	for _, part := range []string{"secret=ABC", "issuer=Travel+Tracker", "digits=6", "period=30"} {
		if !strings.Contains(uri, part) {
			t.Errorf("uri %s missing %s", uri, part)
		}
	}
}

func TestRecoveryCodes(t *testing.T) {
	codes, err := generateRecoveryCodes()
	if err != nil {
		t.Fatal(err)
	}
	if len(codes) != recoveryCodeCount {
		t.Fatalf("got %d codes", len(codes))
	}
	seen := map[string]bool{}
	for _, c := range codes {
		if len(c) != 11 || c[5] != '-' {
			t.Errorf("bad format %q", c)
		}
		if seen[c] {
			t.Errorf("duplicate code %q", c)
		}
		seen[c] = true
	}
	if normalizeRecoveryCode(" ABCDE-12345 ") != "abcde12345" {
		t.Error("normalization should strip dashes, spaces and case")
	}
}

func TestNewUUID(t *testing.T) {
	id, err := newUUID()
	if err != nil {
		t.Fatal(err)
	}
	if len(id) != 36 || id[14] != '4' {
		t.Fatalf("not a v4 uuid: %s", id)
	}
}
