#!/bin/bash
docker-compose -f "$(dirname "$0")/docker-compose.yml" exec -T postgres psql -U postgres -d voquill -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
"
echo "Database reset. Restart the gateway to re-run migrations."
