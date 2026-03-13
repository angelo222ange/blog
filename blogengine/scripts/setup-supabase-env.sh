#!/bin/bash
# Update .env on VPS to use Supabase PostgreSQL
# Run: bash scripts/setup-supabase-env.sh

ENV_FILE="$HOME/zuply/blogengine/.env"

# Remove old DATABASE_URL line
grep -v '^DATABASE_URL=' "$ENV_FILE" > "$ENV_FILE.tmp"

# Remove old DIRECT_URL line if exists
grep -v '^DIRECT_URL=' "$ENV_FILE.tmp" > "$ENV_FILE.tmp2"

# Add new values at the top
DB="postgresql://postgres.gjqokihpospqxjqwytdd"
PW="Zuply2026Secure"
HOST="aws-1-eu-west-2.pooler.supabase.com"
DHOST="aws-1-eu-west-2.pooler.supabase.com"

echo "DATABASE_URL=\"${DB}:${PW}@${HOST}:5432/postgres?pgbouncer=true\"" > "$ENV_FILE"
echo "DIRECT_URL=\"${DB}:${PW}@${DHOST}:5432/postgres\"" >> "$ENV_FILE"
cat "$ENV_FILE.tmp2" >> "$ENV_FILE"

rm -f "$ENV_FILE.tmp" "$ENV_FILE.tmp2"

echo "=== Verification ==="
grep DATABASE_URL "$ENV_FILE"
grep DIRECT_URL "$ENV_FILE"
echo ""
echo "Done! Now run: git pull origin main && npx prisma generate && npx pm2 restart all"
