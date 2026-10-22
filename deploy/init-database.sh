#!/bin/sh
set -eu
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=app_password="$TUKNEX_DB_PASSWORD" <<'SQL'
CREATE ROLE tuknex_app LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE tuknex TO tuknex_app;
GRANT USAGE, CREATE ON SCHEMA public TO tuknex_app;
SQL
