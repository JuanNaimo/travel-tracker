FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.20

RUN apk --no-cache add ca-certificates && \
    adduser -D -H -u 10001 app

COPY --from=builder /out/api /usr/local/bin/api

USER app

EXPOSE 3001
ENV PORT=3001

CMD ["api"]
