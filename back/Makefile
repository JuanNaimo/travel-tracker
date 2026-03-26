.PHONY: help build run test clean docker-build docker-run

help: ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Compilar la aplicación
	@echo "Building..."
	@go build -o bin/main cmd/api/main.go

run: ## Ejecutar la aplicación
	@echo "Running..."
	@go run cmd/api/main.go

test: ## Ejecutar tests
	@echo "Testing..."
	@go test -v ./...

test-cover: ## Ejecutar tests con cobertura
	@echo "Testing with coverage..."
	@go test -cover ./...

clean: ## Limpiar archivos compilados
	@echo "Cleaning..."
	@rm -rf bin/
	@go clean

deps: ## Descargar dependencias
	@echo "Downloading dependencies..."
	@go mod download
	@go mod tidy

docker-build: ## Construir imagen Docker
	@echo "Building Docker image..."
	@docker build -t travel-tracker-api .

docker-run: ## Ejecutar contenedor Docker
	@echo "Running Docker container..."
	@docker run -d --name travel-api -p 3001:3001 \
		-e DB_HOST=host.docker.internal \
		-e DB_PASSWORD=$${DB_PASSWORD} \
		travel-tracker-api

docker-stop: ## Detener contenedor Docker
	@docker stop travel-api
	@docker rm travel-api

lint: ## Ejecutar linter
	@echo "Linting..."
	@golangci-lint run

fmt: ## Formatear código
	@echo "Formatting..."
	@go fmt ./...

.DEFAULT_GOAL := help
