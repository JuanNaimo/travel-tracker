# Base de Datos Travel Tracker

Base de datos PostgreSQL 17 de la aplicación. La autenticación (registro, login, JWT,
MFA) se implementa en el backend Go; la base solo guarda los datos.

## Estructura de la Base de Datos

Todas las tablas están en el esquema `public`:

- **users**: usuarios (email, hash bcrypt de la contraseña y estado de MFA)
- **refresh_tokens**: refresh tokens rotativos (solo el hash SHA-256), agrupados por `family_id` (una familia = una sesión)
- **mfa_recovery_codes**: códigos de recuperación de MFA (hash SHA-256, un solo uso)
- **trips**: viajes del usuario
- **places**: lugares visitados en cada viaje (borrado en cascada al borrar el viaje)
- **place_photos**: fotos de los lugares (borrado en cascada al borrar el lugar)

Las restricciones `CHECK` validan rangos de latitud/longitud, ratings (1–5), gastos no
negativos y largo de las descripciones de fotos.

## Scripts SQL

Se ejecutan en orden alfabético la primera vez que arranca el contenedor (volumen vacío):

1. **01-create-tables.sql**: tablas, índices y triggers
2. **02-row-level-security.sql**: función `current_user_id()` y políticas RLS (`ENABLE` + `FORCE`)
3. **03-create-app-role.sh**: crea el rol `DB_APP_USER` (sin superusuario) con permisos de lectura/escritura sobre las tablas; es el que usa la API en Docker

> Si cambia el esquema hay que recrear el volumen: `docker-compose down -v && docker-compose up -d`
> (borra los datos).

## Row Level Security

El backend filtra cada query por `user_id` y, además, configura el usuario en cada
transacción para que las políticas RLS actúen como segunda barrera:

```sql
SELECT set_config('app.current_user_id', '<uuid-del-usuario>', true);  -- equivale a SET LOCAL
SELECT * FROM trips;  -- solo devuelve los viajes de ese usuario
```

**Importante:** los superusuarios de PostgreSQL ignoran RLS. Por eso Docker Compose
conecta la API con el rol `DB_APP_USER` (`travel_app` por defecto), creado por
`03-create-app-role.sh`, y no con `POSTGRES_USER`.

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

Se configuran en el `.env` de la raíz del repo (ver `.env.example`): `DB_USER`,
`DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `DB_APP_USER` y `DB_APP_PASSWORD`.

## Mantenimiento

Limpiar refresh tokens vencidos (los revocados no vencidos se conservan para detectar reutilización):

```sql
DELETE FROM refresh_tokens WHERE expires_at < NOW();
```
