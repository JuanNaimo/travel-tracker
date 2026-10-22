FROM postgres:17-alpine

# Solo se ejecutan con el volumen de datos vacío
COPY 01-create-tables.sql /docker-entrypoint-initdb.d/
COPY 02-row-level-security.sql /docker-entrypoint-initdb.d/
COPY --chmod=755 03-create-app-role.sh /docker-entrypoint-initdb.d/

EXPOSE 5432
