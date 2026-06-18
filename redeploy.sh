#!/bin/bash
# =============================================================================
# Redeploy — atualiza o sistema sem reconfigurar infraestrutura
# Rode após copiar os arquivos atualizados do seu Mac para o servidor
# =============================================================================
set -euo pipefail

APP_DIR="/var/www/escala"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[>>]${NC} $1"; }

warn "Atualizando sistema..."

# Copia arquivos (assume que o projeto está em ~/Escala)
warn "Copiando arquivos..."
sudo rsync -a --exclude='node_modules' --exclude='.env' --exclude='vendor' \
  ~/Escala/backend/  ${APP_DIR}/backend/
sudo rsync -a --exclude='node_modules' \
  ~/Escala/frontend/ ${APP_DIR}/frontend/

sudo chown -R www-data:www-data ${APP_DIR}
sudo chmod -R 775 ${APP_DIR}/backend/storage
sudo chmod -R 775 ${APP_DIR}/backend/bootstrap/cache

# Backend
warn "Atualizando dependências PHP..."
cd ${APP_DIR}/backend
sudo -u www-data composer install --no-dev --optimize-autoloader --quiet --ignore-platform-reqs

warn "Rodando migrations..."
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan storage:link --force 2>/dev/null || true
sudo mkdir -p ${APP_DIR}/backend/storage/app/public/portal
sudo chown -R www-data:www-data ${APP_DIR}/backend/storage

warn "Limpando cache..."
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan route:cache
sudo -u www-data php artisan view:cache

# Frontend
warn "Buildando frontend..."
cd ~/Escala/frontend
npm install --quiet
npm run build --quiet
sudo mkdir -p ${APP_DIR}/frontend/dist
sudo cp -r ~/Escala/frontend/dist/. ${APP_DIR}/frontend/dist/
sudo chown -R www-data:www-data ${APP_DIR}/frontend/dist

# Reinicia serviços
sudo systemctl reload php8.3-fpm
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo -e "${GREEN}Redeploy concluído!${NC}"
echo ""
