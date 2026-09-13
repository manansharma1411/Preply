# Stage 1: Build Frontend Production Assets
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Cloud Run Environment Config
ENV NODE_ENV=production
ENV PORT=8080

# Install Backend Production Dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy Backend Code
COPY backend/ ./backend/

# Copy Built Frontend Bundle
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Cloud Run default port
EXPOSE 8080

# Start Application Server
CMD ["node", "backend/src/server.js"]
