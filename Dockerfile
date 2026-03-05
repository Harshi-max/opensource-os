# Build stage for frontend
FROM node:18-alpine AS client-builder

WORKDIR /app/client

# Copy frontend package files
COPY client/package*.json ./
RUN npm ci

# Copy frontend source
COPY client/ ./

# Build frontend
RUN npm run build

# Main application stage
FROM node:18-alpine

WORKDIR /app

# Copy root and server package files
COPY package*.json ./
RUN npm ci --only=production

COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server source
COPY server/ ./server/

# Copy built frontend from builder stage
COPY --from=client-builder /app/client/dist ./client/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["npm", "start"]
