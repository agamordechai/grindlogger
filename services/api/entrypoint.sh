#!/bin/sh
set -e

# The migrations assume the base tables already exist, so a fresh database is
# created from the models and stamped at head instead of migrated from zero.
if python -c "
import sys
from sqlalchemy import inspect
from services.api.src.database.database import engine
sys.exit(0 if set(inspect(engine).get_table_names()) - {'alembic_version'} else 1)
"; then
    echo "Running database migrations..."
    python -m alembic -c services/api/alembic.ini upgrade head
else
    echo "Empty database: creating schema from models..."
    python -c "from services.api.src.database.database import init_db; init_db()"
    python -m alembic -c services/api/alembic.ini stamp head
fi

echo "Starting API server..."
exec python -m uvicorn services.api.src.api:app --host 0.0.0.0 --port 8000
