# Dockerfile para el backend en Go

# Stage 1: Builder
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Descargar dependencias (capa cacheada mientras no cambie go.mod/go.sum)
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fuente y compilar un binario estático
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

# Stage 2: Runtime
FROM alpine:3.20

# Certificados SSL y usuario sin privilegios
RUN apk --no-cache add ca-certificates && \
    adduser -D -H -u 10001 app

COPY --from=builder /out/api /usr/local/bin/api

USER app

EXPOSE 3001
ENV PORT=3001

CMD ["api"]
