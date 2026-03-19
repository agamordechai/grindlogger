#!/bin/sh
set -e

echo "Running database migrations..."
python -m alembic -c services/api/alembic.ini upgrade head

echo "Starting API server..."
exec python -m uvicorn services.api.src.api:app --host 0.0.0.0 --port 8000
