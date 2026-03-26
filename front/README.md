# Travel Tracker Frontend

Frontend de la aplicación Travel Tracker construido con Next.js 16.

## Cambios Realizados - Migración de Supabase a API Local

El frontend ha sido actualizado para conectarse a un backend PostgreSQL local en lugar de Supabase:

### 1. Nuevo Cliente API ([lib/api-client.ts](lib/api-client.ts))
- Reemplaza `lib/supabase-client.ts`
- Gestión de autenticación con JWT/tokens de sesión
- Funciones para operaciones CRUD de trips y places
- Manejo de errores mejorado

### 2. Componentes Actualizados
Todos los componentes ahora usan `@/lib/api-client`:
- `components/auth-form.tsx` - Login/registro con API
- `components/create-trip-dialog.tsx` - Usa user_id dinámico
- `components/add-place-dialog.tsx` - Usa user_id dinámico
- `app/dashboard/*.tsx` - Importan desde api-client
- `components/*.tsx` - Tipos desde api-client

## Configuración

### Variables de Entorno

Copia `.env.example` como `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Usuario Demo

- **Email**: demo@traveltracker.com
- **Contraseña**: Demo123456!

## Desarrollo Local

```bash
# Instalar dependencias
pnpm install

# Modo desarrollo
pnpm dev

# Build de producción
pnpm build

# Ejecutar producción
pnpm start
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## Docker

### Construir la Imagen

```bash
docker build -t travel-tracker-front .
```

### Ejecutar el Contenedor

```bash
docker run -d \
  --name travel-front \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3001/api \
  travel-tracker-front
```

## Estructura del Proyecto

```
front/
├── app/                    # Rutas de Next.js App Router
│   ├── dashboard/         # Páginas del dashboard
│   ├── page.tsx           # Página de login
│   └── layout.tsx         # Layout principal
├── components/            # Componentes React
│   ├── ui/               # Componentes de UI (shadcn)
│   ├── auth-form.tsx     # Formulario de autenticación
│   └── ...
├── lib/                   # Utilidades y configuración
│   └── api-client.ts     # Cliente de API
└── public/               # Archivos estáticos
```

## API Client

### Autenticación

```typescript
import { auth } from '@/lib/api-client'

// Login
const { user, error } = await auth.signIn(email, password)

// Registro
const { user, error } = await auth.signUp(email, password, metadata)

// Logout
await auth.signOut()

// Obtener usuario actual
const user = auth.getCurrentUser()
```

### Base de Datos

```typescript
import { db } from '@/lib/api-client'

// Trips
const { data, error } = await db.trips.getAll()
const { data, error } = await db.trips.create(tripData)

// Places
const { data, error } = await db.places.getAll()
const { data, error } = await db.places.getByTripId(tripId)
```

## Tecnologías

- **Next.js 16** - Framework React
- **React 19** - Librería UI
- **TypeScript** - Tipado estático
- **Tailwind CSS 4** - Estilos
- **Radix UI** - Componentes accesibles
- **Leaflet** - Mapas interactivos
- **Lucide React** - Iconos

## Características

- Mapa Interactivo con OpenStreetMap
- Gestión de Viajes y Lugares
- Sistema de Categorías
- Calificaciones por estrellas
- Seguimiento de Gastos
- Búsqueda de Lugares
- Diseño Responsive
