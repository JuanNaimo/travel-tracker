# Travel Tracker Frontend

Frontend de la aplicación Travel Tracker construido con Next.js 16.

Se conecta al API en Go (`../back`) mediante [lib/api-client.ts](lib/api-client.ts).

## Autenticación

- **JWT**: el login devuelve un access token (15 min) y un refresh token. `api-client`
  agrega el access token en cada request y, si el API responde 401, lo renueva con el
  refresh token y reintenta una vez (un solo refresh en curso aunque haya varias requests).
- **MFA**: si el usuario tiene la verificación en dos pasos activa, `auth-form` pide el
  código de 6 dígitos (o un código de recuperación) después de la contraseña.
- **Configuración de MFA**: en **Perfil › Verificación en dos pasos**
  ([components/mfa-settings-dialog.tsx](components/mfa-settings-dialog.tsx)): muestra el QR,
  confirma el código y entrega los códigos de recuperación.

## Estilo

El diseño sigue la idea de una **tarjeta de embarque**: tema oscuro por defecto con amarillo de
cartel de aeropuerto (`--signal`), títulos en Anton, datos en JetBrains Mono y texto en Inter Tight.
El tema claro ("papel") usa la tinta como color principal y deja el amarillo para rellenos.

- [components/boarding-pass.tsx](components/boarding-pass.tsx): el viaje como tarjeta de embarque.
  Los códigos de tres letras (`placeCode` en `lib/travel.ts`) salen del primer y el último lugar.
- [components/departure-board.tsx](components/departure-board.tsx): la lista de viajes como tablero de salidas.
- [components/split-flap.tsx](components/split-flap.tsx): títulos que se acomodan letra por letra.
- [components/ui-providers.tsx](components/ui-providers.tsx): grosor de íconos y configuración de Motion.

## Páginas

La app es la misma en el celular y en la compu: en pantallas chicas la navegación es una barra
inferior con un botón central de **Nueva entrada**; desde 1024 px pasa a un menú lateral.

| Ruta | Qué muestra |
|---|---|
| `/dashboard` | Inicio: viaje en curso con su progreso, totales, viajes, próximo viaje y fotos recientes |
| `/dashboard/trips` | Mis viajes, con búsqueda y filtros por estado y año |
| `/dashboard/trips/[id]` | Detalle del viaje: diario día por día, fotos y lugares en el mapa |
| `/dashboard/entries/new` | Nueva entrada del diario (`?viaje=`, `?lat=&lng=` la precargan) |
| `/dashboard/entries/[id]/edit` | Editar o eliminar una entrada y sus fotos |
| `/dashboard/map` | Todos los lugares; clic derecho (o mantener apretado) agrega una entrada ahí |
| `/dashboard/photos` | Todas las fotos agrupadas por viaje |
| `/dashboard/profile` | Totales, tema claro/oscuro, MFA, exportar datos y cerrar sesión |

Cada **entrada del diario es un lugar** (`places` en el API): el título es el nombre del lugar,
"¿Cómo estuvo?" es la calificación (5 = Increíble … 1 = Difícil) y el tipo de lugar es la
categoría. Las fotos grandes se achican en el navegador a 2000 px antes de subirse.

## Configuración

### Variables de Entorno

Crea `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Lint
npm run lint

# Build de producción (falla si hay errores de tipos)
npm run build

# Ejecutar producción
npm start
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
  travel-tracker-front
```

> `NEXT_PUBLIC_API_URL` se incrusta en el bundle durante `npm run build`: pasarla con `-e`
> al ejecutar el contenedor no tiene efecto. Pasala al construir:
> `docker build --build-arg NEXT_PUBLIC_API_URL=https://api.ejemplo.com/api -t travel-tracker-front .`
> (docker-compose ya la toma del `.env`).

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

// Login (primer factor)
const { user, mfaToken, error } = await auth.signIn(email, password)

// Si mfaToken no es null, completar con el código TOTP o de recuperación
const { user, error } = await auth.verifyMfa(mfaToken, code)

// Registro
const { user, error } = await auth.signUp(email, password, metadata)

// Logout
await auth.signOut()

// Usuario guardado localmente / validado contra el API
const user = auth.getCurrentUser()
const { user, error } = await auth.getUser()
```

### MFA

```typescript
import { mfa } from '@/lib/api-client'

const { data } = await mfa.setup()          // { secret, otpauth_url }
const { data } = await mfa.enable(code)     // { recovery_codes }
const { error } = await mfa.disable(password, code)
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

// Fotos
const { data, error } = await db.photos.getAll()
const { data, error } = await db.photos.getByTripId(tripId)
const { data, error } = await db.photos.create({ place_id, photo_url, caption })
```

## Tecnologías

- **Next.js 16** - Framework React
- **React 19** - Librería UI
- **TypeScript** - Tipado estático
- **Tailwind CSS 4** - Estilos
- **Radix UI** - Componentes accesibles
- **Leaflet** - Mapas interactivos
- **qrcode.react** - Código QR para configurar MFA
- **Phosphor Icons** - Íconos (trazo `bold` por defecto, `fill` para el estado activo). Reemplaza a Lucide
- **Motion** - Animaciones (`motion/react` con `LazyMotion` y `m.*`; respeta "reducir movimiento")

## Características

- Mapa Interactivo con OpenStreetMap
- Gestión de Viajes y Lugares
- Sistema de Categorías
- Calificaciones por estrellas
- Seguimiento de Gastos
- Búsqueda de Lugares
- Diseño Responsive
