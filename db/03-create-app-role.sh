#!/bin/sh
# Crea el rol sin privilegios con el que se conecta la API.
# El superusuario (POSTGRES_USER) ignora las políticas RLS; este rol no.
set -e

if [ -z "$DB_APP_USER" ] || [ -z "$DB_APP_PASSWORD" ]; then
  echo "DB_APP_USER/DB_APP_PASSWORD no definidos: no se crea el rol de la API" >&2
  exit 0
fi

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_user="$DB_APP_USER" -v app_password="$DB_APP_PASSWORD" -v db_name="$POSTGRES_DB" <<'EOSQL'
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";
GRANT USAGE ON SCHEMA public TO :"app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";
EOSQL
