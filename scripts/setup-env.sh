#!/bin/sh
# Crea .env a partir de .env.example con secretos aleatorios. No pisa un .env existente.
set -e
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo ".env ya existe, no se modifica"
  exit 0
fi

random_hex() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$1"
  else
    head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

sed \
  -e "s|^DB_PASSWORD=.*|DB_PASSWORD=$(random_hex 16)|" \
  -e "s|^DB_APP_PASSWORD=.*|DB_APP_PASSWORD=$(random_hex 16)|" \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=$(random_hex 32)|" \
  .env.example > .env

echo ".env creado con contraseñas y JWT_SECRET aleatorios"
