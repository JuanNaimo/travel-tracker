# Travel Tracker App

Aplicación completa para rastrear y organizar tus viajes alrededor del mundo, construida con Next.js, Go y PostgreSQL.

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   PostgreSQL    │
│   Next.js 16    │     │   Go 1.23       │     │   v17 Alpine    │
│   Port: 3000    │     │   Port: 3001    │     │   Port: 5432    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Características

- **Frontend moderno** con Next.js 16 y React 19
- **Backend robusto** en Go con PostgreSQL
- **Autenticación con JWT** (access token corto + refresh token rotativo)
- **Verificación en dos pasos (MFA)** con TOTP y códigos de recuperación
- **Row Level Security (RLS)** para seguridad de datos
- **Mapas interactivos** con OpenStreetMap/Leaflet
- **Gestión de viajes y lugares** con categorías
- **Sistema de calificaciones** por estrellas
- **Seguimiento de gastos** por lugar
- **Diario de viaje** día por día, con fotos, descripción y cómo estuvo cada día
- **Álbum de fotos** por viaje y galería de todas las fotos
- **Diseño adaptable**: barra inferior en el celular y menú lateral en la compu, con modo oscuro
- **Docker Compose** para deployment fácil

## Estructura del Proyecto

```
travel-tracker-app/
├── db/                          # Base de datos PostgreSQL
│   ├── 01-create-tables.sql   # Esquema de tablas
│   ├── 02-row-level-security.sql  # Políticas RLS
│   ├── 03-create-app-role.sh  # Rol sin privilegios para la API
│   ├── Dockerfile             # Build de PostgreSQL
│   └── README.md              # Documentación de DB
│
├── back/                       # Backend API en Go
│   ├── cmd/api/               # Punto de entrada
│   ├── internal/              # Código interno
│   │   ├── auth/             # JWT, TOTP (MFA) y refresh tokens
│   │   ├── database/         # Conexión a DB
│   │   ├── handlers/         # HTTP handlers
│   │   ├── middleware/       # Middlewares
│   │   └── models/           # Modelos de datos
│   ├── Dockerfile            # Build de Go
│   ├── Makefile              # Comandos de desarrollo
│   └── README.md             # Documentación de API
│
├── front/                      # Frontend Next.js
│   ├── app/                   # Next.js App Router
│   ├── components/            # Componentes React
│   ├── lib/                   # Utilidades
│   │   └── api-client.ts     # Cliente de API
│   ├── Dockerfile            # Build de Next.js
│   └── README.md             # Documentación de Frontend
│
├── docker-compose.yml          # Orquestación de servicios
├── docker-compose.dev.yml      # Override para desarrollo (hot reload)
├── Makefile                    # make up / dev / down / reset / test
├── scripts/setup-env.sh        # Genera .env con secretos aleatorios
└── README.md                   # Este archivo
```

## Quick Start

### Todo en Docker (Recomendado)

Requisitos: Docker con Docker Compose v2.24 o superior. `make` es opcional.

```bash
# 1. Clonar el repositorio
git clone https://github.com/JuanNaimo/travel-tracker.git
cd travel-tracker

# 2. Crear .env (con contraseñas y JWT_SECRET aleatorios), construir y levantar
make up
```

Sin `make`:

```bash
./scripts/setup-env.sh          # o: cp .env.example .env (valores de ejemplo, solo desarrollo)
docker compose up -d --build
```

- Frontend: http://localhost:3000
- API: http://localhost:3001/api
- PostgreSQL: localhost:5432

La primera vez se crean el esquema y el rol `travel_app` con el que se conecta la API.
Ese rol no es superusuario, así que las políticas RLS aplican.

| Comando | Qué hace |
|---|---|
| `make up` | Construye y levanta db + api + frontend |
| `make ps` / `make logs` | Estado y logs de los servicios |
| `make down` | Detiene todo (conserva los datos) |
| `make reset` | Detiene todo y **borra la base** (necesario si cambia el esquema) |
| `make dev` | Modo desarrollo: código montado y hot reload del frontend |
| `make dev-watch` | Igual que `dev`, y además reinicia el API al guardar cambios en `back/` |
| `make test` | Tests del backend, typecheck y lint del frontend dentro de contenedores |

Los puertos de tu máquina se cambian en `.env` (`FRONT_PORT`, `PORT`, `DB_PORT`). Si cambiás
`PORT`, ajustá también `NEXT_PUBLIC_API_URL` y volvé a construir el frontend.

### Modo desarrollo en Docker

`make dev` (o `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`)
usa `docker-compose.dev.yml`:

- **frontend**: `next dev` con el código de `front/` montado; los cambios se ven al instante.
- **api**: `go run` con el código de `back/` montado. Con `make dev-watch` se reinicia
  solo al guardar; con `make dev` reinicialo con `docker compose restart api`.
- **db**: igual que en producción (mismo volumen de datos).

### Desarrollo Local (sin Docker para API y frontend)

#### Base de Datos

```bash
cd db
docker build -t travel-tracker-db .
docker run -d --name travel-db \
  -e POSTGRES_PASSWORD=tu_contraseña \
  -p 5432:5432 \
  travel-tracker-db
```

#### Backend

```bash
# Usa el .env de la raíz del repo
set -a && source ../.env && set +a
cd back
go mod download
go run cmd/api/main.go
```

#### Frontend

```bash
cd front
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" > .env.local
npm install
npm run dev
```

## Endpoints de la API

### Autenticación

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión. Devuelve tokens, o `{ mfa_required, mfa_token }` si el usuario tiene MFA
- `POST /api/auth/mfa/verify` - Completar el login con un código TOTP o de recuperación
- `POST /api/auth/refresh` - Rotar el refresh token y obtener un access token nuevo
- `POST /api/auth/logout` - Revocar el refresh token
- `GET /api/auth/me` - Usuario actual (protegido)
- `POST /api/auth/mfa/setup` - Generar secreto TOTP (protegido)
- `POST /api/auth/mfa/enable` - Confirmar MFA con un código; devuelve códigos de recuperación (protegido)
- `POST /api/auth/mfa/disable` - Desactivar MFA con contraseña + código (protegido)

### Trips (Requieren Autenticación)

- `GET /api/trips` - Listar viajes
- `POST /api/trips` - Crear viaje
- `GET /api/trips/{id}` - Obtener viaje
- `PUT /api/trips/{id}` - Actualizar viaje
- `DELETE /api/trips/{id}` - Eliminar viaje

### Places (Requieren Autenticación)

- `GET /api/places` - Listar lugares
- `GET /api/places?trip_id={id}` - Listar lugares de un viaje
- `POST /api/places` - Crear lugar
- `GET /api/places/{id}` - Obtener lugar
- `PUT /api/places/{id}` - Actualizar lugar
- `DELETE /api/places/{id}` - Eliminar lugar

### Fotos (Requieren Autenticación)

- `GET /api/trips/{id}/photos` - Fotos de todos los lugares de un viaje
- `GET /api/places/{id}/photos` - Fotos de un lugar
- `POST /api/places/{id}/photos` - Agregar foto (`photo_url` como data URL base64 o URL https)
- `GET /api/photos` - Todas las fotos del usuario
- `DELETE /api/photos/{id}` - Eliminar foto

### Health Check

- `GET /health` - Estado del servidor

## Variables de Entorno

Todas se definen en el `.env` de la raíz (ver `.env.example`):

| Variable | Descripción | Default |
|---|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_SSLMODE` | Conexión a PostgreSQL (`DB_PORT` es el puerto en tu máquina) | `localhost`, `5432`, `travel_tracker`, `disable` |
| `DB_USER`, `DB_PASSWORD` | Superusuario: crea el esquema (y lo usa el API si lo corrés fuera de Docker) | `travel_user`, — |
| `DB_APP_USER`, `DB_APP_PASSWORD` | Rol sin privilegios que usa el API en Docker | `travel_app`, — |
| `FRONT_PORT` | Puerto del frontend en tu máquina | `3000` |
| `PORT` | Puerto del API | `3001` |
| `JWT_SECRET` | Secreto HS256 para firmar los JWT. **Obligatorio**, mínimo 32 caracteres | — |
| `JWT_ACCESS_TTL` | Duración del access token | `15m` |
| `JWT_REFRESH_TTL` | Duración del refresh token | `720h` |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos, separados por coma | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | URL del API para el frontend (se fija en el build) | `http://localhost:3001/api` |

## Tecnologías

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI (shadcn/ui)
- Leaflet (mapas)

### Backend
- Go 1.23
- Gorilla Mux (router)
- lib/pq (PostgreSQL driver)
- golang-jwt (JWT HS256)
- bcrypt (hashing)
- TOTP (RFC 6238) implementado con la stdlib
- CORS middleware

### Base de Datos
- PostgreSQL 17 Alpine
- Row Level Security (RLS)
- Índices optimizados

## Seguridad

- **Contraseñas**: bcrypt (cost 12), entre 8 y 72 caracteres
- **Access token**: JWT HS256 de 15 minutos, validado en cada request protegido (issuer, audiencia, expiración y algoritmo)
- **Refresh token**: aleatorio de 256 bits, guardado como hash SHA-256 y **rotado** en cada uso. Si se reutiliza un token ya rotado se revoca toda la sesión
- **MFA**: TOTP de 6 dígitos (compatible con Google Authenticator, Authy, 1Password…), con protección contra reutilización del mismo código y 10 códigos de recuperación de un solo uso
- **Rate limiting**: login (10 intentos por email / 50 por IP cada 15 min) y códigos MFA (5 intentos cada 15 min)
- **Aislamiento de datos**: cada query filtra por `user_id` del token, además de las políticas RLS
- **CORS**: solo los orígenes de `CORS_ALLOWED_ORIGINS`
- **Validación**: rangos de coordenadas, ratings, gastos, fechas y tamaño de requests

## Desarrollo

### Comandos Útiles

```bash
# Backend
cd back
make help          # Ver comandos disponibles
make build         # Compilar
make run           # Ejecutar
make test          # Tests
make docker-build  # Build Docker

# Frontend
cd front
npm run dev       # Desarrollo
npm run build     # Build de producción (incluye chequeo de tipos)
npm run lint      # ESLint
npm start         # Ejecutar producción

# Docker Compose (equivalentes de make up/logs/down/reset)
docker compose up -d --build      # Levantar servicios
docker compose logs -f api        # Ver logs del API
docker compose down               # Detener servicios
docker compose down -v            # Detener y eliminar volúmenes
```

### Logs

```bash
# Logs de todos los servicios
docker compose logs -f

# Logs de un servicio específico
docker compose logs -f db
docker compose logs -f api
docker compose logs -f frontend
```

## Testing

```bash
# Backend
cd back
go test ./...
go test -cover ./...

# Frontend
cd front
npm run lint
npx tsc --noEmit
```

## Deployment

### Producción

1. Configurar variables de entorno seguras
2. Usar HTTPS en el frontend
3. Configurar orígenes CORS específicos
4. Habilitar SSL en PostgreSQL
5. Mantener el rol sin privilegios de la API (`DB_APP_USER`) también en producción, para que RLS aplique
6. Configurar backups de la base de datos
7. Monitoreo y alertas

### Servicios Cloud

La aplicación puede desplegarse en:
- **Vercel** (Frontend)
- **Railway/Render** (Backend + DB)
- **AWS/GCP/Azure** (Todo)
- **DigitalOcean App Platform**

## Troubleshooting

### Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL está corriendo
docker compose ps

# Ver logs
docker compose logs db

# Reiniciar servicios
docker compose restart db api
```

### El frontend no se conecta al API

1. Verificar `NEXT_PUBLIC_API_URL` en `.env.local`
2. Verificar que el API esté corriendo en el puerto 3001
3. Revisar CORS en el backend

### Error "relation ... does not exist" o columnas faltantes

Los scripts SQL solo se ejecutan cuando el volumen de datos está vacío. Si cambió el esquema, reconstruir la base de datos (borra los datos):

```bash
docker compose down -v
docker compose up -d
```

## Roadmap

- [x] Implementar JWT
- [x] Agregar refresh token rotation
- [x] Verificación en dos pasos (TOTP)
- [x] API de fotos para lugares
- [x] Montar el álbum de fotos en una página de viaje
- [ ] Guardar fotos en un object storage en lugar de la base de datos
- [ ] Exportar viajes a PDF
- [ ] Compartir viajes públicamente
- [ ] Estadísticas y gráficos
- [ ] App móvil (React Native)
- [ ] Notificaciones push
- [ ] Integración con Google Photos
- [ ] Modo offline

## Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## Licencia

MIT

## Contacto

Para preguntas o soporte, abre un issue en GitHub.
