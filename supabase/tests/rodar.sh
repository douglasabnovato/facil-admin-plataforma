#!/usr/bin/env bash
# rodar.sh — recria o banco de teste, aplica as migrações e roda o cenário completo.
# Uso: DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bash supabase/tests/rodar.sh
# ATENÇÃO: apaga e recria o banco "faciladmin_teste" no servidor informado. Nunca aponte para produção.
set -euo pipefail
: "${DATABASE_URL:?defina DATABASE_URL (servidor Postgres com PostGIS)}"
DIR="$(cd "$(dirname "$0")" && pwd)"
BASE="${DATABASE_URL%/*}"
psql "$DATABASE_URL" -q -c "DROP DATABASE IF EXISTS faciladmin_teste" -c "CREATE DATABASE faciladmin_teste"
export TESTE_URL="$BASE/faciladmin_teste"
psql "$TESTE_URL" -q -v ON_ERROR_STOP=1 -f "$DIR/ambiente.sql"
for f in "$DIR"/../migrations/*.sql; do
  # pg_cron não existe no Postgres comum: a migração 05 já trata a ausência.
  sed 's/^CREATE EXTENSION IF NOT EXISTS pg_cron.*$//' "$f" | tr -d '\r' | psql "$TESTE_URL" -q -v ON_ERROR_STOP=1 >/dev/null
  echo "ok $(basename "$f")"
done
python3 "$DIR/cenario.py"
# Fim de rodar.sh
