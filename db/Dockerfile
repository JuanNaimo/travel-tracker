FROM postgres:17-alpine

# Instalar extensiones necesarias
RUN apk add --no-cache postgresql-contrib

# Copiar scripts de inicialización
# Los scripts se ejecutan en orden alfabético
COPY 01-create-tables.sql /docker-entrypoint-initdb.d/
COPY 02-row-level-security.sql /docker-entrypoint-initdb.d/

# Exponer el puerto de PostgreSQL
EXPOSE 5432

