#!/usr/bin/env bash
# PostgreSQL logical backup for Thirty One 31.
# Runs pg_dump INSIDE the slot-postgres container (so the client version always matches the server),
# writes a timestamped custom-format (-Fc) dump, gzips it, and prunes old copies (retention).
#
#   ./scripts/db-backup.sh                 # one backup, keep newest 14
#   BACKUP_KEEP=30 ./scripts/db-backup.sh  # keep newest 30
#
# Env overrides: PG_CONTAINER, PG_DB, PG_USER, BACKUP_DIR, BACKUP_KEEP
set -euo pipefail
CONTAINER="${PG_CONTAINER:-slot-postgres}"
DB="${PG_DB:-slot_platform}"
DBUSER="${PG_USER:-slot_user}"
DIR="${BACKUP_DIR:-$(cd "$(dirname "$0")/.." && pwd)/backups}"
KEEP="${BACKUP_KEEP:-14}"

mkdir -p "$DIR"
TS="$(date +%Y%m%d-%H%M%S)"
OUT="$DIR/slot_platform-$TS.dump"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "ERROR: container '$CONTAINER' is not running" >&2
  exit 1
fi

# -Fc = custom format → supports pg_restore --clean/--if-exists and selective/parallel restore.
docker exec "$CONTAINER" pg_dump -U "$DBUSER" -d "$DB" -Fc > "$OUT"
gzip -f "$OUT"
echo "backup: $OUT.gz ($(du -h "$OUT.gz" | cut -f1))"

# Retention: keep the newest $KEEP, delete the rest (portable — no mapfile/bash4).
OLD="$(ls -1t "$DIR"/slot_platform-*.dump.gz 2>/dev/null | tail -n +"$((KEEP+1))" || true)"
if [ -n "$OLD" ]; then
  printf '%s\n' "$OLD" | xargs rm -f
  echo "retention: pruned $(printf '%s\n' "$OLD" | wc -l | tr -d ' ') old backup(s), kept newest $KEEP"
else
  echo "retention: $(ls -1 "$DIR"/slot_platform-*.dump.gz 2>/dev/null | wc -l | tr -d ' ') backup(s) on disk (keep $KEEP)"
fi
