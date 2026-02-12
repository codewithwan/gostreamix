FROM golang:alpine AS builder
RUN apk add --no-cache git gcc musl-dev
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
RUN go install github.com/a-h/templ/cmd/templ@latest
COPY . .
RUN templ generate
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -trimpath -o gostreamix main.go

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata ffmpeg
WORKDIR /app
COPY --from=builder /app/gostreamix .
COPY --from=builder /app/assets ./assets
EXPOSE 8080
ENTRYPOINT ["./gostreamix"]
