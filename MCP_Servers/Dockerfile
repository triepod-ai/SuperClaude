# Multi-stage build for SuperClaude MCP Servers
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    postgresql-client \
    curl \
    dumb-init

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./

# Copy shared module
COPY shared/ ./shared/

# Install dependencies for shared module
WORKDIR /app/shared
RUN npm ci --only=production

# Build shared module
RUN npm run build

# Development stage
FROM base AS development

WORKDIR /app

# Install all dependencies (including dev)
RUN npm ci

# Copy all server modules
COPY superclaude-tasks/ ./superclaude-tasks/
COPY superclaude-orchestrator/ ./superclaude-orchestrator/
COPY superclaude-code/ ./superclaude-code/
COPY superclaude-intelligence/ ./superclaude-intelligence/
COPY superclaude-ui/ ./superclaude-ui/
COPY superclaude-quality/ ./superclaude-quality/
COPY superclaude-performance/ ./superclaude-performance/

# Install dependencies for all modules
RUN npm install --workspaces

# Build all modules
RUN npm run build --workspaces

# Create data directory
RUN mkdir -p /app/data && chmod 755 /app/data

# Expose common ports
EXPOSE 3001 3002 3003 3004 3005 3006 3007

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command
CMD ["npm", "run", "start:tasks"]

# Production stage
FROM base AS production

WORKDIR /app

# Copy built shared module
COPY --from=base /app/shared/dist ./shared/dist
COPY --from=base /app/shared/package.json ./shared/

# Create non-root user
RUN addgroup -g 1001 -S superclaude && \
    adduser -S superclaude -u 1001 -G superclaude

# Copy server modules (built)
COPY --chown=superclaude:superclaude superclaude-tasks/dist ./superclaude-tasks/dist/
COPY --chown=superclaude:superclaude superclaude-tasks/package.json ./superclaude-tasks/

COPY --chown=superclaude:superclaude superclaude-orchestrator/dist ./superclaude-orchestrator/dist/
COPY --chown=superclaude:superclaude superclaude-orchestrator/package.json ./superclaude-orchestrator/

COPY --chown=superclaude:superclaude superclaude-code/dist ./superclaude-code/dist/
COPY --chown=superclaude:superclaude superclaude-code/package.json ./superclaude-code/

COPY --chown=superclaude:superclaude superclaude-intelligence/dist ./superclaude-intelligence/dist/
COPY --chown=superclaude:superclaude superclaude-intelligence/package.json ./superclaude-intelligence/

COPY --chown=superclaude:superclaude superclaude-ui/dist ./superclaude-ui/dist/
COPY --chown=superclaude:superclaude superclaude-ui/package.json ./superclaude-ui/

COPY --chown=superclaude:superclaude superclaude-quality/dist ./superclaude-quality/dist/
COPY --chown=superclaude:superclaude superclaude-quality/package.json ./superclaude-quality/

COPY --chown=superclaude:superclaude superclaude-performance/dist ./superclaude-performance/dist/
COPY --chown=superclaude:superclaude superclaude-performance/package.json ./superclaude-performance/

# Copy configuration files
COPY --chown=superclaude:superclaude shared/config ./shared/config/

# Create necessary directories
RUN mkdir -p /app/data /var/log/superclaude && \
    chown -R superclaude:superclaude /app/data /var/log/superclaude

# Switch to non-root user
USER superclaude

# Set environment variables
ENV NODE_ENV=production
ENV MCP_SERVER_PORT=3001
ENV CONFIG_PATH=/app/shared/config/production.json

# Expose ports
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${MCP_SERVER_PORT}/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Default command (can be overridden)
CMD ["node", "superclaude-tasks/dist/index.js"]

# Metadata
LABEL maintainer="SuperClaude Team"
LABEL version="1.0.0"
LABEL description="SuperClaude MCP Servers for enhanced Claude Code integration"
LABEL org.opencontainers.image.source="https://github.com/superclaude/mcp-servers"
LABEL org.opencontainers.image.documentation="https://docs.superclaude.ai"
LABEL org.opencontainers.image.licenses="MIT"