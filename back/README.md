# Travel Tracker API - Backend en Go

Backend REST API para la aplicación Travel Tracker, construido con Go y PostgreSQL.

## Características

- ✅ Autenticación con JWT (access token de 15 min) y refresh tokens rotativos
- ✅ Verificación en dos pasos (TOTP) con códigos de recuperación
- ✅ Aislamiento por usuario en cada query + Row Level Security (RLS)
- ✅ Endpoints RESTful para trips, places y fotos
- ✅ Validación de datos y límites de tamaño de request
- ✅ Rate limiting en login y MFA
- ✅ CORS configurable
- ✅ Hashing de contraseñas con bcrypt
- ✅ Multi-stage Docker build

## Estructura del Proyecto

```
back/
├── cmd/
│   └── api/
│       └── main.go              # Punto de entrada y rutas
├── internal/
│   ├── auth/
│   │   ├── auth.go              # Usuarios, refresh tokens y MFA
│   │   ├── jwt.go               # Emisión y validación de JWT
│   │   └── totp.go              # TOTP (RFC 6238)
│   ├── database/
│   │   └── database.go          # Conexión y contexto RLS
│   ├── handlers/
│   │   ├── auth_handlers.go     # Registro, login, MFA, refresh
│   │   ├── trip_handlers.go     # Handlers de trips
│   │   ├── place_handlers.go    # Handlers de places
│   │   ├── photo_handlers.go    # Handlers de fotos
│   │   └── helpers.go           # Utilidades comunes
│   ├── middleware/
│   │   ├── middleware.go        # Auth JWT, límites de body, logger
│   │   └── ratelimit.go         # Rate limiter en memoria
│   └── models/
│       ├── models.go            # Modelos de datos
│       └── validation.go        # Validaciones de entrada
├── Dockerfile                   # Multi-stage build
├── go.mod                       # Dependencias
└── README.md                    # Este archivo
```

## Dependencias

- **gorilla/mux** - Router HTTP
- **lib/pq** - Driver PostgreSQL
- **rs/cors** - Middleware CORS
- **golang.org/x/crypto** - Bcrypt para hashing
- **golang-jwt/jwt/v5** - Firma y validación de JWT

## Configuración

### Variables de Entorno

⚠️ **IMPORTANTE**: Este proyecto usa un `.env` centralizado en la raíz.

**NO uses `.env` en esta carpeta**. Todas las variables están en `../.env`
(ver `../.env.example` y la tabla de variables en el README principal).

`JWT_SECRET` es obligatorio (mínimo 32 caracteres): la API no arranca sin él.
Generalo con `openssl rand -hex 32`.

Para desarrollo local:
```bash
# Opción 1: Cargar variables manualmente
export $(cat ../.env | grep -v '^#' | xargs)
go run cmd/api/main.go

# Opción 2: Usar make
make run
```

## Desarrollo Local

### Prerequisitos

- Go 1.23 o superior
- PostgreSQL 17
- Base de datos configurada (ver carpeta `db/`)

### Ejecutar en modo desarrollo

```bash
# Instalar dependencias
go mod download

# Ejecutar
go run cmd/api/main.go
```

La API estará disponible en `http://localhost:3001`

## Endpoints de la API

### Autenticación (Públicos)

#### POST /api/auth/register
Registrar un nuevo usuario. La contraseña debe tener entre 8 y 72 caracteres.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "metadata": { "full_name": "John Doe" }
}
```

**Response (201):**
```json
{ "success": true, "userId": "uuid", "message": "User registered successfully" }
```

#### POST /api/auth/login
Primer factor (email + contraseña).

**Request:**
```json
{ "email": "user@example.com", "password": "password123" }
```

**Response si el usuario NO tiene MFA:**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<token opaco>",
  "token_type": "Bearer",
  "expires_at": "2026-01-01T00:15:00Z",
  "user": { "id": "uuid", "email": "user@example.com", "mfa_enabled": false, "created_at": "..." }
}
```

**Response si el usuario tiene MFA:**
```json
{ "mfa_required": true, "mfa_token": "<jwt de 5 minutos>" }
```

#### POST /api/auth/mfa/verify
Segundo factor. `code` puede ser el código TOTP de 6 dígitos o un código de recuperación.

**Request:**
```json
{ "mfa_token": "<jwt>", "code": "123456" }
```

**Response:** igual al login sin MFA (access + refresh token).

#### POST /api/auth/refresh
Canjea el refresh token por un par nuevo (el anterior queda revocado). Si se presenta
un refresh token ya usado, se revoca toda la sesión.

**Request:**
```json
{ "refresh_token": "<token>" }
```

#### POST /api/auth/logout
Revoca el refresh token. El access token deja de servir cuando expira (15 min por defecto).

**Request:**
```json
{ "refresh_token": "<token>" }
```

### Autenticación (Protegidos)

Todas las rutas protegidas requieren:
```
Authorization: Bearer <access_token>
```

#### GET /api/auth/me
Devuelve el usuario autenticado (incluye `mfa_enabled`).

#### POST /api/auth/mfa/setup
Genera un secreto TOTP pendiente de confirmación.

**Response:**
```json
{ "secret": "BASE32...", "otpauth_url": "otpauth://totp/Travel%20Tracker:user@example.com?..." }
```

El frontend muestra `otpauth_url` como código QR.

#### POST /api/auth/mfa/enable
Confirma el setup con un código de la app y activa MFA.

**Request:** `{ "code": "123456" }`

**Response:** `{ "recovery_codes": ["a1b2c-3d4e5", "..."] }` (10 códigos de un solo uso; se muestran una única vez)

#### POST /api/auth/mfa/disable
**Request:** `{ "password": "...", "code": "123456" }`

### Trips (Requieren Autenticación)

#### GET /api/trips
Obtener todos los viajes del usuario

#### GET /api/trips/{id}
Obtener un viaje específico

#### POST /api/trips
Crear un nuevo viaje

**Request:**
```json
{
  "name": "Europa 2024",
  "description": "Gran viaje",
  "start_date": "2024-06-01",
  "end_date": "2024-06-15",
  "rating": 5
}
```

#### PUT /api/trips/{id}
Actualizar un viaje

#### DELETE /api/trips/{id}
Eliminar un viaje

### Places (Requieren Autenticación)

#### GET /api/places
Obtener todos los lugares del usuario

Query params:
- `trip_id` (opcional) - Filtrar por viaje

#### GET /api/places/{id}
Obtener un lugar específico

#### POST /api/places
Crear un nuevo lugar

**Request:**
```json
{
  "trip_id": "uuid",
  "name": "Torre Eiffel",
  "description": "Increíble vista",
  "category": "atraccion",
  "latitude": 48.8584,
  "longitude": 2.2945,
  "rating": 5,
  "visit_date": "2024-06-05",
  "expenses": 150.00
}
```

#### PUT /api/places/{id}
Actualizar un lugar

#### DELETE /api/places/{id}
Eliminar un lugar

### Fotos (Requieren Autenticación)

#### GET /api/trips/{id}/photos
Fotos de todos los lugares de un viaje.

#### GET /api/places/{id}/photos
Fotos de un lugar.

#### POST /api/places/{id}/photos
**Request:**
```json
{ "photo_url": "data:image/jpeg;base64,...", "caption": "Opcional, máx. 200 caracteres" }
```
`photo_url` acepta data URLs base64 (jpeg, png, webp, gif) o URLs `https://`. El body puede pesar hasta 8 MB.

#### DELETE /api/photos/{id}

### Health Check

#### GET /health
Verificar estado del servidor

**Response:**
```json
{
  "status": "ok"
}
```

## Docker

### Construir la Imagen

```bash
docker build -t travel-tracker-api .
```

### Ejecutar el Contenedor

```bash
docker run -d \
  --name travel-api \
  -p 3001:3001 \
  -e DB_HOST=db \
  -e DB_PASSWORD=tu_contraseña \
  travel-tracker-api
```

## Seguridad

### Aislamiento de datos

Cada query filtra explícitamente por el `user_id` del access token. Además, cada
transacción configura `app.current_user_id` (vía `set_config`) para las políticas
RLS de PostgreSQL, que actúan como segunda barrera.

> RLS no aplica a superusuarios. En producción conectá la API con un rol sin
> privilegios de superusuario para que las políticas también estén activas.

### Autenticación

- Contraseñas hasheadas con bcrypt (cost 12)
- Access token JWT (HS256) de 15 minutos; se valida firma, algoritmo, issuer, audiencia y expiración
- Refresh token aleatorio (256 bits) de 30 días, guardado como hash SHA-256 y rotado en cada uso,
  con detección de reutilización (revoca la sesión completa)
- Token de desafío MFA de 5 minutos con audiencia propia: no sirve como access token
- TOTP con ventana de ±30 s y protección contra reutilización del mismo código
- 10 códigos de recuperación de un solo uso (guardados como hash)
- Rate limiting en memoria: 10 logins por email y 50 por IP cada 15 min; 5 intentos de código MFA cada 15 min

## Testing

```bash
# Ejecutar tests
go test ./...

# Con cobertura
go test -cover ./...

# Test específico
go test ./internal/auth
```

## Build para Producción

```bash
# Build estático
CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/api

# Ejecutar
./main
```

## Troubleshooting

### Error de conexión a la base de datos

1. Verifica que PostgreSQL esté corriendo
2. Verifica las credenciales en `.env`
3. Verifica que la base de datos `travel_tracker` exista
4. Verifica que los scripts SQL se hayan ejecutado

### Error "relation ... does not exist" o columnas faltantes

Los scripts SQL no se ejecutaron o el esquema cambió. Ejecuta los scripts sobre una base vacía:
```bash
psql -U travel_user -d travel_tracker -f db/01-create-tables.sql
psql -U travel_user -d travel_tracker -f db/02-row-level-security.sql
```

### La API no arranca: "JWT_SECRET must be set"

Define `JWT_SECRET` en el `.env` de la raíz con al menos 32 caracteres (`openssl rand -hex 32`).

### CORS errors

Agrega el origen del frontend a `CORS_ALLOWED_ORIGINS` (lista separada por comas).

## Próximas Mejoras

- [x] Implementar JWT en lugar de tokens de sesión
- [x] Agregar rate limiting
- [x] Implementar refresh token rotation
- [x] Verificación en dos pasos (TOTP)
- [ ] Cifrar el secreto TOTP en la base de datos
- [ ] Agregar logs estructurados (logrus/zap)
- [ ] Agregar métricas (Prometheus)
- [ ] Implementar recuperación de contraseña
- [ ] Agregar tests de integración contra PostgreSQL
- [ ] Documentación con Swagger/OpenAPI

## Licencia

MIT
