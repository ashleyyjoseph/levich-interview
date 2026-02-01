# Multi-stage build for production
FROM node:18-alpine AS builder

# Build the React client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY server/ ./server/
COPY package*.json ./

# Install server dependencies
RUN npm install --production

# Copy built client from builder stage
COPY --from=builder /app/client/build ./client/build

EXPOSE 5000

ENV NODE_ENV=production

# Start server
CMD ["node", "server/index.js"]
