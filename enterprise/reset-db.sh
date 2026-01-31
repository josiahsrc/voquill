#!/bin/bash
COMPOSE_DIR="$(dirname "$0")"
docker-compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T postgres psql -U postgres -d voquill -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
"
docker-compose -f "$COMPOSE_DIR/docker-compose.yml" restart gateway
echo "Database reset and gateway restarted."
