package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/subtle"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// Implementación de TOTP (RFC 6238) con los parámetros que soportan todas las
// apps autenticadoras: HMAC-SHA1, 6 dígitos, períodos de 30 segundos.
const (
	totpPeriod = 30
	totpDigits = 6
	// Se aceptan códigos del período anterior y siguiente para tolerar
	// diferencias de reloj entre el servidor y el teléfono.
	totpSkew = 1

	totpIssuer = "Travel Tracker"
)

var b32 = base32.StdEncoding.WithPadding(base32.NoPadding)

// GenerateTOTPSecret genera un secreto aleatorio de 160 bits codificado en base32
func GenerateTOTPSecret() (string, error) {
	secret := make([]byte, 20)
	if _, err := rand.Read(secret); err != nil {
		return "", err
	}
	return b32.EncodeToString(secret), nil
}

// TOTPProvisioningURI genera la URI otpauth:// que se muestra como código QR
func TOTPProvisioningURI(secret, accountName string) string {
	label := url.PathEscape(totpIssuer + ":" + accountName)
	params := url.Values{}
	params.Set("secret", secret)
	params.Set("issuer", totpIssuer)
	params.Set("algorithm", "SHA1")
	params.Set("digits", fmt.Sprint(totpDigits))
	params.Set("period", fmt.Sprint(totpPeriod))
	return "otpauth://totp/" + label + "?" + params.Encode()
}

// totpCode calcula el código para un paso de tiempo dado (RFC 4226, sección 5.3)
func totpCode(key []byte, step int64) string {
	var msg [8]byte
	binary.BigEndian.PutUint64(msg[:], uint64(step))

	mac := hmac.New(sha1.New, key)
	mac.Write(msg[:])
	sum := mac.Sum(nil)

	offset := sum[len(sum)-1] & 0x0f
	value := binary.BigEndian.Uint32(sum[offset:offset+4]) & 0x7fffffff
	return fmt.Sprintf("%0*d", totpDigits, value%1_000_000)
}

// ValidateTOTP verifica un código contra el secreto. Para evitar ataques de
// repetición solo acepta pasos posteriores a lastUsedStep; devuelve el paso
// que coincidió para que el llamador lo persista.
func ValidateTOTP(secret, code string, now time.Time, lastUsedStep int64) (int64, bool) {
	code = strings.TrimSpace(code)
	if len(code) != totpDigits {
		return 0, false
	}
	key, err := b32.DecodeString(strings.ToUpper(secret))
	if err != nil {
		return 0, false
	}

	current := now.Unix() / totpPeriod
	for step := current - totpSkew; step <= current+totpSkew; step++ {
		if step <= lastUsedStep {
			continue
		}
		if subtle.ConstantTimeCompare([]byte(totpCode(key, step)), []byte(code)) == 1 {
			return step, true
		}
	}
	return 0, false
}
