# ==============================================================================
# FlytOps: Asset Intelligence Copilot - Production Multi-Stage Dockerfile
# Optimized for Render, Cloud Run, Railway, and Container Environments
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React Vite Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/web

# Install frontend dependencies
COPY web/package*.json ./
RUN npm ci || npm install

# Copy source and build static bundle (outputs to /app/copilot/static/app)
COPY web/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Python Runtime
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runner
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install runtime utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application packages and data
COPY copilot/ /app/copilot/
COPY backend/ /app/backend/
COPY dataset/ /app/dataset/
COPY run_server.py /app/run_server.py
COPY SKILL.md /app/SKILL.md

# Copy compiled React frontend assets from Stage 1 into the static app directory
COPY --from=frontend-builder /app/copilot/static/app/ /app/copilot/static/app/

# Expose port (Render automatically maps $PORT dynamically)
EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Launch uvicorn listening on the dynamically assigned $PORT
CMD ["sh", "-c", "uvicorn copilot.server:app --host 0.0.0.0 --port ${PORT:-8000}"]
