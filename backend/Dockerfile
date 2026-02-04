# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY backend/go.mod ./
# Auto-generate go.sum if missing
RUN go mod tidy
RUN go mod download
COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /engine cmd/server/main.go

# Run stage
FROM alpine:latest
WORKDIR /
COPY --from=builder /engine /engine
EXPOSE 8080
CMD ["/engine"]
