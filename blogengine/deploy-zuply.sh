#!/bin/bash
set -e

DOMAIN="app.zuply.fr"
REPO_URL="https://github.com/angelo222ange/blog.git"
APP_DIR="/home/deploy/zuply"
CERTBOT_EMAIL="contact@drm-services.fr"

echo ""
echo "========================================="
echo "  Deploiement Zuply - $DOMAIN"
echo "========================================="

# 1. Clone or update repo
if [ ! -d "$APP_DIR" ]; then
  echo "[1/7] Clonage du repo..."
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "[1/7] Mise a jour du repo..."
  cd "$APP_DIR"
  git checkout -- . 2>/dev/null || true
  git pull origin main
fi

cd "$APP_DIR/blogengine"

# 2. Create .env if missing
if [ ! -f ".env" ]; then
  echo "[2/7] Creation du .env..."
  echo "IMPORTANT: Copie .env.example vers .env et remplis les valeurs"
  cp .env.example .env
  echo "❌ Edite /home/deploy/zuply/blogengine/.env puis relance le script"
  exit 1
else
  echo "[2/7] .env existant"
fi

# 3. Install dependencies
echo "[3/7] Installation des dependances..."
npm install --legacy-peer-deps 2>&1 | tail -3

# 4. Generate Prisma client + run migrations
echo "[4/7] Prisma generate + migrate..."
npx prisma generate
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma migrate deploy 2>/dev/null || true

# 5. Seed admin user if needed
echo "[5/7] Seed base de donnees..."
npx tsx apps/api/src/seed.ts 2>/dev/null || true

# 6. Build frontend
echo "[6/7] Build Next.js..."
cd apps/web
npm run build
cd ../..

# 7. Setup PM2 processes
echo "[7/7] Demarrage PM2..."

# Check if pm2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "Installation de PM2..."
  sudo npm install -g pm2
fi

# Stop existing processes
pm2 delete zuply-api 2>/dev/null || true
pm2 delete zuply-web 2>/dev/null || true

# Start API (Fastify on port 4000)
pm2 start "npx tsx apps/api/src/server.ts" \
  --name zuply-api \
  --cwd "$APP_DIR/blogengine" \
  --env production \
  --max-restarts 10

# Start Frontend (Next.js on port 3001)
pm2 start "npx next start -p 3001" \
  --name zuply-web \
  --cwd "$APP_DIR/blogengine/apps/web" \
  --env production \
  --max-restarts 10

pm2 save

echo ""
echo "PM2 status:"
pm2 list

# Nginx config
NGINX_CONF="/etc/nginx/sites-available/zuply"

echo ""
echo "Configuration Nginx pour $DOMAIN..."

sudo tee "$NGINX_CONF" > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name app.zuply.fr;

    # API routes -> Fastify (port 4000)
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }

    # Uploaded files (social images, motion videos)
    location /uploads/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_valid 200 1h;
    }

    # Frontend -> Next.js (port 3001)
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/

echo "Test Nginx..."
if sudo nginx -t; then
  sudo systemctl reload nginx
  echo "Nginx OK"
else
  echo "❌ Erreur Nginx"
  exit 1
fi

# SSL
if ! grep -q "ssl_certificate" "$NGINX_CONF" 2>/dev/null; then
  echo ""
  echo "Configuration SSL..."
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$CERTBOT_EMAIL" || echo "⚠️  SSL echoue (DNS pas encore propage ?)"
fi

echo ""
echo "========================================="
echo "  DEPLOYE AVEC SUCCES!"
echo "  https://$DOMAIN"
echo ""
echo "  API:      http://127.0.0.1:4000"
echo "  Frontend: http://127.0.0.1:3001"
echo "  PM2:      pm2 list / pm2 logs"
echo "========================================="
