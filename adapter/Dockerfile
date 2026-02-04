# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY adapter/package*.json ./
RUN npm install
COPY adapter/ .
RUN npx tsc

# Run stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
CMD ["node", "dist/adapter.js"]
