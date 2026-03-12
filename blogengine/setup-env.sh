#!/bin/bash
set -e

ENV_FILE="/home/deploy/zuply/blogengine/.env"

echo ""
echo "========================================="
echo "  Configuration .env pour Zuply"
echo "========================================="
echo ""

# Generate secrets automatically
JWT_SECRET=$(openssl rand -hex 32)
SCHEDULER_SECRET=$(openssl rand -hex 32)
SOCIAL_ENCRYPTION_KEY=$(openssl rand -hex 16)

# Prompt for required values
read -p "ADMIN_EMAIL (defaut: admin@zuply.fr): " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@zuply.fr}

read -sp "ADMIN_PASSWORD: " ADMIN_PASSWORD
echo ""
if [ -z "$ADMIN_PASSWORD" ]; then
  echo "Erreur: ADMIN_PASSWORD est obligatoire"
  exit 1
fi

read -p "OPENAI_API_KEY: " OPENAI_API_KEY
read -p "GITHUB_TOKEN: " GITHUB_TOKEN
read -p "RESEND_API_KEY (optionnel, Enter pour passer): " RESEND_API_KEY
read -p "GEMINI_API_KEY (optionnel, Enter pour passer): " GEMINI_API_KEY

echo ""
echo "--- Reseaux sociaux ---"
echo ""

# Meta (Facebook)
read -p "META_APP_ID: " META_APP_ID
read -p "META_APP_SECRET: " META_APP_SECRET

# Instagram
read -p "INSTAGRAM_APP_ID: " INSTAGRAM_APP_ID
read -p "INSTAGRAM_APP_SECRET: " INSTAGRAM_APP_SECRET

# LinkedIn
read -p "LINKEDIN_CLIENT_ID: " LINKEDIN_CLIENT_ID
read -p "LINKEDIN_CLIENT_SECRET: " LINKEDIN_CLIENT_SECRET

# Twitter (optionnel)
read -p "TWITTER_CLIENT_ID (optionnel, Enter pour passer): " TWITTER_CLIENT_ID
read -p "TWITTER_CLIENT_SECRET (optionnel, Enter pour passer): " TWITTER_CLIENT_SECRET

# Pinterest (optionnel)
read -p "PINTEREST_APP_ID (optionnel, Enter pour passer): " PINTEREST_APP_ID
read -p "PINTEREST_APP_SECRET (optionnel, Enter pour passer): " PINTEREST_APP_SECRET

# TikTok (optionnel)
read -p "TIKTOK_CLIENT_KEY (optionnel, Enter pour passer): " TIKTOK_CLIENT_KEY
read -p "TIKTOK_CLIENT_SECRET (optionnel, Enter pour passer): " TIKTOK_CLIENT_SECRET

# Write .env file
cat > "$ENV_FILE" << EOF
DATABASE_URL="file:./dev.db"
JWT_SECRET=$JWT_SECRET
SCHEDULER_SECRET=$SCHEDULER_SECRET
OPENAI_API_KEY=$OPENAI_API_KEY
GITHUB_TOKEN=$GITHUB_TOKEN
UNSPLASH_ACCESS_KEY=
PEXELS_API_KEY=
GEMINI_API_KEY=$GEMINI_API_KEY
VPS_HOST=
VPS_USER=
VPS_KEY_PATH=
RESEND_API_KEY=$RESEND_API_KEY

# Frontend URL
FRONTEND_URL=https://app.zuply.fr
CORS_ORIGIN=https://app.zuply.fr

# Admin seed credentials
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Social Media OAuth
SOCIAL_ENCRYPTION_KEY=$SOCIAL_ENCRYPTION_KEY
SOCIAL_OAUTH_REDIRECT_BASE=https://app.zuply.fr

# Meta (Facebook)
META_APP_ID=$META_APP_ID
META_APP_SECRET=$META_APP_SECRET

# Instagram
INSTAGRAM_APP_ID=$INSTAGRAM_APP_ID
INSTAGRAM_APP_SECRET=$INSTAGRAM_APP_SECRET

# LinkedIn
LINKEDIN_CLIENT_ID=$LINKEDIN_CLIENT_ID
LINKEDIN_CLIENT_SECRET=$LINKEDIN_CLIENT_SECRET

# X / Twitter
TWITTER_CLIENT_ID=$TWITTER_CLIENT_ID
TWITTER_CLIENT_SECRET=$TWITTER_CLIENT_SECRET

# Pinterest
PINTEREST_APP_ID=$PINTEREST_APP_ID
PINTEREST_APP_SECRET=$PINTEREST_APP_SECRET

# TikTok
TIKTOK_CLIENT_KEY=$TIKTOK_CLIENT_KEY
TIKTOK_CLIENT_SECRET=$TIKTOK_CLIENT_SECRET
EOF

echo ""
echo ".env cree avec succes!"
echo "Secrets generes automatiquement."
echo ""
echo "Relance maintenant: ./deploy-zuply.sh"
