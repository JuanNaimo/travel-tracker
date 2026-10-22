.PHONY: help env up down logs ps reset dev dev-watch test

COMPOSE := docker compose
DEV := $(COMPOSE) -f docker-compose.yml -f docker-compose.dev.yml

help: ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

env: ## Crear .env con secretos aleatorios (si no existe)
	@./scripts/setup-env.sh

up: env ## Construir y levantar todo (db + api + frontend)
	$(COMPOSE) up -d --build
	@echo ""
	@echo "Frontend: http://localhost:3000"
	@echo "API:      http://localhost:3001/api"

down: ## Detener los servicios (conserva los datos)
	$(COMPOSE) down

logs: ## Ver logs de todos los servicios
	$(COMPOSE) logs -f

ps: ## Estado de los servicios
	$(COMPOSE) ps

reset: ## Detener y BORRAR la base de datos (recrea el esquema al volver a levantar)
	$(COMPOSE) down -v

dev: env ## Modo desarrollo: hot reload del frontend (Ctrl+C para salir)
	$(DEV) up --build

dev-watch: env ## Modo desarrollo + reinicio automático del API al cambiar back/
	$(DEV) up --build --watch

test: ## Tests del backend y chequeos del frontend dentro de Docker
	docker run --rm -v "$(CURDIR)/back:/app" -w /app golang:1.23-alpine go test ./...
	docker run --rm -v "$(CURDIR)/front:/app" -v front_test_node_modules:/app/node_modules -w /app node:20-alpine \
		sh -c "npm ci --no-audit --no-fund && npx tsc --noEmit && npm run lint"
