# Multi-stage build for Asset Tracker Pro
# Stage 1: Build the frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY components.json ./
COPY theme.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY index.html ./
COPY public/ ./public/

# Build the frontend
RUN npm run build

# Stage 2: Setup Python environment for AI services
FROM python:3.11-slim as python-builder

WORKDIR /app/python-ai

# Copy Python requirements and install dependencies
COPY python-ai/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python source code
COPY python-ai/ ./

# Stage 3: Final production image
FROM node:18-alpine

# Install Python in the final image
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy package files for backend
COPY package*.json ./
COPY backend/package.json ./backend/

# Install Node.js dependencies (including backend dependencies)
RUN npm ci --only=production

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./frontend/dist

# Copy Python environment from stage 2
COPY --from=python-builder /app/python-ai ./python-ai

# Copy API routes
COPY api/ ./api/

# Create logs directory
RUN mkdir -p /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Elastic Beanstalk expects port 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "backend/server.js"]
