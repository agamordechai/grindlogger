# API Dockerfile for GrindLogger
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies (curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH"

# Install dependencies first (cached unless pyproject.toml/uv.lock change)
COPY pyproject.toml uv.lock ./
RUN mkdir -p services && touch services/__init__.py && \
    uv sync --no-dev --no-install-project

# Copy source code (changes here won't re-install deps)
COPY services/__init__.py ./services/
COPY services/shared/ ./services/shared/
COPY services/api/ ./services/api/

# Create directory for database
RUN mkdir -p /app/data

# Port
EXPOSE 8000

# Run migrations then start the app
CMD ["sh", "services/api/entrypoint.sh"]
