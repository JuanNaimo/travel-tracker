# Base de Datos Travel Tracker

Sistema de base de datos PostgreSQL con autenticación local para reemplazar Supabase Auth.

## Estructura de la Base de Datos

Todas las tablas están en el esquema `public`:

- **users**: Tabla de usuarios con autenticación local
- **sessions**: Sesiones activas de usuarios
- **refresh_tokens**: Tokens de actualización para renovar sesiones
- **trips**: Viajes del usuario
- **places**: Lugares visitados en cada viaje
- **place_photos**: Fotos de los lugares

## Scripts SQL

1. **01-create-tables.sql**: Crea todas las tablas
2. **02-row-level-security.sql**: Configura RLS y la función `current_user_id()`
3. **03-seed-demo-data.sql**: (Opcional) Datos de demostración
4. **04-auth-functions.sql**: Funciones auxiliares para autenticación

## Funciones de Autenticación Disponibles

### Registro de Usuario
```sql
SELECT create_user(
    'user@example.com',
    '$2a$10$hashedpassword...',  -- Hash bcrypt
    '{"full_name": "John Doe"}'::jsonb
);
```

### Login / Crear Sesión
```sql
-- 1. Obtener usuario y verificar contraseña (en tu backend)
SELECT * FROM get_user_by_email('user@example.com');

-- 2. Crear sesión después de verificar contraseña
SELECT create_session(
    'user-uuid',
    'session-token',
    'refresh-token',
    NOW() + INTERVAL '7 days',
    '192.168.1.1'::inet,
    'Mozilla/5.0...'
);
```

### Validar Sesión
```sql
SELECT * FROM validate_session('session-token');
```

### Logout
```sql
SELECT delete_session('session-token');
```

### Recuperación de Contraseña
```sql
-- 1. Generar token de recuperación
SELECT generate_recovery_token('user@example.com');

-- 2. Validar token (desde email)
SELECT * FROM validate_recovery_token('recovery-token');

-- 3. Actualizar contraseña
SELECT update_password('user-uuid', '$2a$10$newhash...');

-- 4. Limpiar token usado
SELECT clear_recovery_token('user-uuid');
```

### Refresh Token
```sql
-- Crear refresh token
SELECT create_refresh_token(
    'refresh-token',
    'user-uuid',
    NOW() + INTERVAL '30 days'
);

-- Validar y usar refresh token
SELECT * FROM use_refresh_token('refresh-token');
```

## Uso de Row Level Security

Para que las políticas RLS funcionen, debes configurar el user_id en cada transacción:

### Desde tu Backend (Node.js/JavaScript)
```javascript
// Al inicio de cada request autenticado
await client.query('SET LOCAL app.current_user_id = $1', [userId]);

// Ahora las queries respetarán RLS automáticamente
const trips = await client.query('SELECT * FROM trips');
```

### Desde Python
```python
# Al inicio de cada request autenticado
cursor.execute("SET LOCAL app.current_user_id = %s", (user_id,))

# Las queries ahora filtran por usuario automáticamente
cursor.execute("SELECT * FROM trips")
```

### Desde SQL directo
```sql
-- Configurar usuario actual
SET LOCAL app.current_user_id = 'uuid-del-usuario';

-- Ahora las queries filtran automáticamente
SELECT * FROM trips;  -- Solo verá sus propios viajes
```

## Usuario de Demostración

Si ejecutas el script `03-seed-demo-data.sql`:

- **Email**: demo@traveltracker.com
- **Contraseña**: Demo123456!
- **Datos**: 3 viajes de ejemplo

**IMPORTANTE**: Elimina o cambia estos datos en producción.

## Construcción del Contenedor

```bash
# Construir imagen
docker build -t travel-tracker-db ./db

# Ejecutar contenedor
docker run -d \
  --name travel-db \
  -e POSTGRES_USER=travel_user \
  -e POSTGRES_PASSWORD=tu_contraseña_segura \
  -e POSTGRES_DB=travel_tracker \
  -v pgdata:/var/lib/postgresql/data \
  -p 5432:5432 \
  travel-tracker-db
```

## Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```env
POSTGRES_USER=travel_user
POSTGRES_PASSWORD=tu_contraseña_segura
POSTGRES_DB=travel_tracker
POSTGRES_PORT=5432
```

## Mantenimiento

### Limpiar sesiones expiradas
```sql
SELECT cleanup_expired_sessions();
```

Puedes programar esto como un cron job o ejecutarlo periódicamente desde tu aplicación.

## Seguridad

1. **Contraseñas**: Siempre hashea con bcrypt (cost factor 10-12)
2. **Tokens**: Usa `gen_random_bytes()` para tokens seguros
3. **RLS**: Siempre configura `app.current_user_id` en transacciones autenticadas
4. **Variables de entorno**: Nunca pongas credenciales en el código
5. **HTTPS**: Usa siempre HTTPS en producción
6. **JWT**: Considera usar JWT para tokens más seguros

## Diferencias con Supabase

Este sistema usa el esquema `public` en lugar de `auth`:
- Todas las tablas están en el esquema público
- La función `current_user_id()` reemplaza a `auth.uid()`
- Las políticas RLS funcionan igual
- Necesitas implementar la lógica de login/registro en tu backend

## Próximos Pasos

1. Implementa el backend de autenticación (registro, login, logout)
2. Hashea contraseñas con bcrypt
3. Genera tokens seguros (JWT o random tokens)
4. Configura `app.current_user_id` en cada request
5. Implementa refresh token rotation
6. Agrega rate limiting para prevenir ataques
