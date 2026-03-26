# Dockerfile para el backend en Go

# Stage 1: Builder
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache git

# Copiar go.mod y go.sum
COPY go.mod go.sum* ./

# Descargar dependencias
RUN go mod download

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/api

# Stage 2: Runtime
FROM alpine:latest

# Instalar certificados SSL
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copiar el binario desde builder
COPY --from=builder /app/main .

# Exponer puerto
EXPOSE 3001

# Variables de entorno por defecto
ENV PORT=3001
ENV DB_HOST=db
ENV DB_PORT=5432
ENV DB_USER=travel_user
ENV DB_NAME=travel_tracker
ENV DB_SSLMODE=disable

# Ejecutar la aplicación
CMD ["./main"]
