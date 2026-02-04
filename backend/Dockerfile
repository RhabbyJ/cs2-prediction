# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Copy all backend source first so go mod tidy can see imports
COPY backend/ .
RUN go mod tidy
RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux go build -o /engine cmd/server/main.go

# Run stage
FROM alpine:latest
WORKDIR /
COPY --from=builder /engine /engine
EXPOSE 8080
CMD ["/engine"]
