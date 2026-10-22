FROM postgres:17-alpine

# Scripts de inicialización: se ejecutan en orden alfabético solo cuando el
# volumen de datos está vacío (primer arranque o después de `docker compose down -v`)
COPY 01-create-tables.sql /docker-entrypoint-initdb.d/
COPY 02-row-level-security.sql /docker-entrypoint-initdb.d/
COPY --chmod=755 03-create-app-role.sh /docker-entrypoint-initdb.d/

EXPOSE 5432
