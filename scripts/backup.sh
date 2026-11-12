#!/usr/bin/env bash
# Backup database MusicPedia ke backups/musicpedia-<waktu>.sql (dump SQL biasa).
# Jalankan dari root proyek saat stack berjalan:  ./scripts/backup.sh
# Jadwal harian (cron host, pukul 02.00):
#   0 2 * * * cd /path/ke/MusicPedia && ./scripts/backup.sh >> backups/backup.log 2>&1
# Pulihkan (ke database kosong / baru di-reset, lihat README):
#   docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/<file>.sql
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups
out="backups/musicpedia-$(date +%Y%m%d-%H%M%S).sql"
tmp="$out.partial"
trap 'rm -f "$tmp"' EXIT

# Kredensial dibaca dari environment container db (sama dengan .env Compose).
docker compose exec -T db sh -c 'pg_dump --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$tmp"

if [ ! -s "$tmp" ] || ! grep -q 'PostgreSQL database dump complete' "$tmp"; then
  echo "GAGAL  dump kosong atau tidak lengkap; backup tidak disimpan" >&2
  exit 1
fi

mv "$tmp" "$out"
echo "OK  $out ($(wc -c < "$out") byte)"
