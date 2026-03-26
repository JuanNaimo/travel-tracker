# Travel Tracker API - Backend en Go

Backend REST API para la aplicación Travel Tracker, construido con Go y PostgreSQL.

## Características

- ✅ Autenticación con tokens de sesión
- ✅ Row Level Security (RLS) en PostgreSQL
- ✅ Endpoints RESTful para trips y places
- ✅ Middleware de autenticación
- ✅ CORS configurado
- ✅ Hashing de contraseñas con bcrypt
- ✅ Validación de sesiones
- ✅ Multi-stage Docker build

## Estructura del Proyecto

```
back/
├── cmd/
│   └── api/
│       └── main.go           # Punto de entrada de la aplicación
├── internal/
│   ├── auth/
│   │   └── auth.go          # Lógica de autenticación
│   ├── database/
│   │   └── database.go      # Conexión y utilidades de BD
│   ├── handlers/
│   │   ├── auth_handlers.go # Handlers de autenticación
│   │   ├── trip_handlers.go # Handlers de trips
│   │   └── place_handlers.go# Handlers de places
│   ├── middleware/
│   │   └── middleware.go    # Middlewares (auth, CORS, logger)
│   └── models/
│       └── models.go        # Modelos de datos
├── Dockerfile               # Multi-stage build
├── go.mod                   # Dependencias
└── README.md               # Este archivo
```

## Dependencias

- **gorilla/mux** - Router HTTP
- **lib/pq** - Driver PostgreSQL
- **rs/cors** - Middleware CORS
- **golang.org/x/crypto** - Bcrypt para hashing
- **golang-jwt/jwt/v5** - JWT (para futuras mejoras)

## Configuración

### Variables de Entorno

⚠️ **IMPORTANTE**: Este proyecto usa un `.env` centralizado en la raíz.

**NO uses `.env` en esta carpeta**. Todas las variables están en `../env`.

Ver [SETUP.md](../SETUP.md) para configuración completa.

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
- PostgreSQL 18
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
Registrar un nuevo usuario

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "metadata": {
    "full_name": "John Doe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "userId": "uuid",
  "message": "User registered successfully"
}
```

#### POST /api/auth/login
Iniciar sesión

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "sessionToken": "token",
  "refreshToken": "refresh_token",
  "expiresAt": "2024-01-01T00:00:00Z",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "user_metadata": {}
  }
}
```

#### POST /api/auth/logout
Cerrar sesión (requiere autenticación)

**Headers:**
```
Authorization: Bearer <token>
```

### Autenticación (Protegidos)

#### GET /api/auth/validate
Validar sesión actual

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

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

### Row Level Security (RLS)

El backend utiliza RLS de PostgreSQL para asegurar que los usuarios solo puedan acceder a sus propios datos:

1. Cada request autenticado ejecuta: `SET LOCAL app.current_user_id = <user_id>`
2. Las políticas RLS en PostgreSQL filtran automáticamente los datos
3. No es posible acceder a datos de otros usuarios

### Autenticación

- Contraseñas hasheadas con bcrypt (cost factor 10)
- Tokens de sesión aleatorios de 32 bytes
- Sesiones expiran después de 7 días
- Refresh tokens expiran después de 30 días
- Validación de sesión en cada request protegido

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

### Error "function create_user does not exist"

Las funciones de PostgreSQL no están creadas. Ejecuta los scripts:
```bash
psql -U travel_user -d travel_tracker -f db/01-create-tables.sql
psql -U travel_user -d travel_tracker -f db/02-row-level-security.sql
psql -U travel_user -d travel_tracker -f db/04-auth-functions.sql
```

### CORS errors

El middleware CORS ya está configurado para aceptar cualquier origen (`*`). En producción, configura orígenes específicos en `cmd/api/main.go`.

## Próximas Mejoras

- [ ] Implementar JWT en lugar de tokens de sesión
- [ ] Agregar rate limiting
- [ ] Implementar refresh token rotation
- [ ] Agregar logs estructurados (logrus/zap)
- [ ] Agregar métricas (Prometheus)
- [ ] Implementar recuperación de contraseña
- [ ] Agregar tests unitarios e integración
- [ ] Documentación con Swagger/OpenAPI

## Licencia

MIT
