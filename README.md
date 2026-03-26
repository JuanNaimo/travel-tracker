# Travel Tracker App

Aplicación completa para rastrear y organizar tus viajes alrededor del mundo, construida con Next.js, Go y PostgreSQL.

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API   │────▶│   PostgreSQL    │
│   Next.js 16    │     │   Go 1.23       │     │   v18 Alpine    │
│   Port: 3000    │     │   Port: 3001    │     │   Port: 5432    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Características

- **Frontend moderno** con Next.js 16 y React 19
- **Backend robusto** en Go con PostgreSQL
- **Autenticación completa** con sesiones y tokens
- **Row Level Security (RLS)** para seguridad de datos
- **Mapas interactivos** con OpenStreetMap/Leaflet
- **Gestión de viajes y lugares** con categorías
- **Sistema de calificaciones** por estrellas
- **Seguimiento de gastos** por lugar
- **Docker Compose** para deployment fácil

## Estructura del Proyecto

```
travel-tracker-app/
├── db/                          # Base de datos PostgreSQL
│   ├── 01-create-tables.sql   # Esquema de tablas
│   ├── 02-row-level-security.sql  # Políticas RLS
│   ├── 03-seed-demo-data.sql  # Datos de ejemplo
│   ├── 04-auth-functions.sql  # Funciones de autenticación
│   ├── Dockerfile             # Build de PostgreSQL
│   └── README.md              # Documentación de DB
│
├── back/                       # Backend API en Go
│   ├── cmd/api/               # Punto de entrada
│   ├── internal/              # Código interno
│   │   ├── auth/             # Lógica de autenticación
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
└── README.md                   # Este archivo
```

## Quick Start

### Con Docker Compose (Recomendado)

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd travel-tracker-app

# 2. Configurar variables de entorno
export DB_PASSWORD=tu_contraseña_segura

# 3. Levantar todos los servicios
docker-compose up -d

# 4. Acceder a la aplicación
# Frontend: http://localhost:3000
# API: http://localhost:3001
# DB: localhost:5432
```

### Desarrollo Local

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
cd back
cp .env.example .env
# Editar .env con tus credenciales
go mod download
go run cmd/api/main.go
```

#### Frontend

```bash
cd front
cp .env.example .env.local
# Editar .env.local
pnpm install
pnpm dev
```

## Credenciales de Demo

La base de datos incluye un usuario de demostración:

- **Email**: demo@traveltracker.com
- **Contraseña**: Demo123456!

## Endpoints de la API

### Autenticación

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/validate` - Validar sesión (protegido)

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

### Health Check

- `GET /health` - Estado del servidor

## Variables de Entorno

### Base de Datos

```env
POSTGRES_USER=travel_user
POSTGRES_PASSWORD=tu_contraseña
POSTGRES_DB=travel_tracker
```

### Backend

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=travel_user
DB_PASSWORD=tu_contraseña
DB_NAME=travel_tracker
DB_SSLMODE=disable
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

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
- bcrypt (hashing)
- CORS middleware

### Base de Datos
- PostgreSQL 18 Alpine
- Row Level Security (RLS)
- Funciones SQL personalizadas
- Índices optimizados

## Seguridad

- **Contraseñas**: Hasheadas con bcrypt (cost factor 10)
- **Tokens**: Generados con crypto/rand (32 bytes)
- **RLS**: Políticas a nivel de base de datos
- **CORS**: Configurado en el backend
- **Sesiones**: Expiran automáticamente
- **Validación**: En cada request protegido

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
pnpm dev          # Desarrollo
pnpm build        # Build de producción
pnpm start        # Ejecutar producción

# Docker Compose
docker-compose up -d              # Levantar servicios
docker-compose logs -f api        # Ver logs del API
docker-compose down               # Detener servicios
docker-compose down -v            # Detener y eliminar volúmenes
```

### Logs

```bash
# Logs de todos los servicios
docker-compose logs -f

# Logs de un servicio específico
docker-compose logs -f db
docker-compose logs -f api
docker-compose logs -f frontend
```

## Testing

```bash
# Backend
cd back
go test ./...
go test -cover ./...

# Frontend
cd front
pnpm test  # Si hay tests configurados
```

## Deployment

### Producción

1. Configurar variables de entorno seguras
2. Usar HTTPS en el frontend
3. Configurar orígenes CORS específicos
4. Habilitar SSL en PostgreSQL
5. Configurar backups de la base de datos
6. Implementar rate limiting
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
docker-compose ps

# Ver logs
docker-compose logs db

# Reiniciar servicios
docker-compose restart db api
```

### El frontend no se conecta al API

1. Verificar `NEXT_PUBLIC_API_URL` en `.env.local`
2. Verificar que el API esté corriendo en el puerto 3001
3. Revisar CORS en el backend

### Error "function create_user does not exist"

Los scripts SQL no se ejecutaron. Reconstruir la base de datos:

```bash
docker-compose down -v
docker-compose up -d db
```

## Roadmap

- [ ] Implementar JWT
- [ ] Agregar refresh token rotation
- [ ] Upload de fotos para lugares
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
