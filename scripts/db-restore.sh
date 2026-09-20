#!/usr/bin/env bash
# Restore a Thirty One 31 backup produced by db-backup.sh.
# DESTRUCTIVE: drops & recreates the objects in the target DB from the dump. Requires an explicit
# backup file and a typed confirmation. Stop the app first so nothing writes mid-restore:
#   ./services.sh stop && ./scripts/db-restore.sh backups/slot_platform-YYYYmmdd-HHMMSS.dump.gz && ./services.sh start
#
# Env overrides: PG_CONTAINER, PG_DB, PG_USER
set -euo pipefail
CONTAINER="${PG_CONTAINER:-slot-postgres}"
DB="${PG_DB:-slot_platform}"
DBUSER="${PG_USER:-slot_user}"
FILE="${1:-}"

[ -z "$FILE" ] && { echo "usage: $0 <backup-file.dump.gz>"; exit 1; }
[ -f "$FILE" ] || { echo "no such file: $FILE"; exit 1; }
docker ps --format '{{.Names}}' | grep -qx "$CONTAINER" || { echo "ERROR: container '$CONTAINER' not running" >&2; exit 1; }

echo "This will OVERWRITE database '$DB' in container '$CONTAINER' from:"
echo "  $FILE"
read -r -p "Type RESTORE to proceed: " confirm
[ "$confirm" = "RESTORE" ] || { echo "aborted."; exit 1; }

# --clean --if-exists drops existing objects first; --no-owner avoids role mismatches.
gunzip -c "$FILE" | docker exec -i "$CONTAINER" pg_restore -U "$DBUSER" -d "$DB" --clean --if-exists --no-owner
echo "restore complete from: $FILE"
echo "Tip: run 'npx prisma migrate deploy' if the dump predates the current schema."
