FROM node:22-alpine AS web-builder
WORKDIR /app
COPY web/package.json web/package-lock.json ./web/
RUN npm ci --prefix ./web
COPY web ./web
RUN mkdir -p ./internal/infrastructure/frontend && npm run build --prefix ./web

FROM golang:1.25-alpine AS go-builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web-builder /app/internal/infrastructure/frontend/build ./internal/infrastructure/frontend/build
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -trimpath -o /out/gostreamix ./main.go

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata ffmpeg && addgroup -S gostreamix && adduser -S -G gostreamix gostreamix
WORKDIR /app
COPY --from=go-builder /out/gostreamix ./gostreamix
COPY --from=go-builder /app/assets ./assets
RUN mkdir -p /app/data/uploads /app/data/thumbnails /app/logs && chown -R gostreamix:gostreamix /app
USER gostreamix
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/health || exit 1
ENTRYPOINT ["./gostreamix"]
