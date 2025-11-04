# Use Playwright base image with Node.js
FROM mcr.microsoft.com/playwright:v1.42.1-jammy

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Create data directory for cookies
RUN mkdir -p /data && chmod 777 /data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HEADLESS=true
ENV PERSIST_COOKIES_PATH=/data/cookies.json

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start server
CMD ["node", "dist/api/server.js"]
