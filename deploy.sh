#!/bin/bash
# =============================================================================
# Deploy — Sistema de Escalas Litúrgicas
# Oracle Cloud Ubuntu 24.04 · VM.Standard.E2.1.Micro (1 OCPU / 1 GB RAM)
# =============================================================================
# Como usar:
#   1. SSH no servidor:  ssh ubuntu@<IP_DO_SERVIDOR>
#   2. Envie o projeto:  scp -r ./Escala ubuntu@<IP>:~/
#   3. Execute:          bash ~/Escala/deploy.sh
#
# Se tiver domínio próprio, defina DOMAIN abaixo antes de rodar.
# Se não tiver domínio, deixe vazio — o sistema funcionará pelo IP.
# =============================================================================

set -euo pipefail

DOMAIN=""                          # Ex: "acolitos.suaparoquia.org.br"
APP_DIR="/var/www/escala"
DB_NAME="escala_liturgica"
DB_USER="escala"
DB_PASS=$(openssl rand -base64 20 | tr -dc 'a-zA-Z0-9' | head -c 20)
APP_KEY=$(openssl rand -base64 32)

# ── Credenciais opcionais (preencha antes de rodar, ou deixe em branco e
#    configure depois em ${APP_DIR}/backend/.env) ────────────────────────────
GEMINI_API_KEY=""                  # Chatbot "Sávio" + importação de agenda por IA (copie do seu .env local)
EVOLUTION_API_URL=""               # Ex: "http://localhost:8080" — deixe vazio até a Evolution API estar rodando
EVOLUTION_API_KEY=""
EVOLUTION_INSTANCE="default"
MAIL_MAILER="log"                  # Troque para "postmark" ou "resend" quando configurar e-mail de alerta admin
POSTMARK_API_KEY=""
RESEND_API_KEY=""

YELLOW='\033[1;33m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[>>]${NC} $1"; }
fail() { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

warn "========================================"
warn "  Deploy — Sistema de Escalas Litúrgicas"
warn "========================================"
echo ""

# ── 1. Swap (essencial em 1 GB RAM) ──────────────────────────────────────────
warn "[1/11] Criando swap de 2 GB..."
if ! swapon --show | grep -q '/swapfile'; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  sudo sysctl vm.swappiness=10
  echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
  log "Swap criado"
else
  log "Swap já existe"
fi

# ── 2. Pacotes ───────────────────────────────────────────────────────────────
warn "[2/11] Instalando dependências..."
sudo apt-get update -qq
sudo apt-get install -y -qq \
  nginx \
  php8.4 php8.4-fpm php8.4-cli php8.4-pgsql php8.4-mbstring \
  php8.4-xml php8.4-curl php8.4-zip php8.4-bcmath php8.4-gd \
  php8.4-intl php8.4-tokenizer php8.4-fileinfo \
  postgresql postgresql-contrib \
  git curl unzip ufw cron \
  certbot python3-certbot-nginx 2>/dev/null
sudo systemctl enable --now cron 2>/dev/null || true

# Node.js 20
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
fi

# Composer
if ! command -v composer &>/dev/null; then
  curl -sS https://getcomposer.org/installer | php
  sudo mv composer.phar /usr/local/bin/composer
fi

log "Dependências instaladas"

# ── 3. PostgreSQL ─────────────────────────────────────────────────────────────
warn "[3/11] Configurando PostgreSQL..."
sudo systemctl enable postgresql --quiet
sudo systemctl start postgresql

sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  && sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" \
  || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"

sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# Tuning para 1 GB RAM
sudo tee /etc/postgresql/16/main/conf.d/low-memory.conf > /dev/null <<EOF
shared_buffers = 128MB
effective_cache_size = 256MB
work_mem = 4MB
maintenance_work_mem = 32MB
max_connections = 30
EOF
sudo systemctl restart postgresql
log "PostgreSQL configurado (DB: ${DB_NAME} / USER: ${DB_USER})"

# ── 4. PHP-FPM tuning ─────────────────────────────────────────────────────────
warn "[4/11] Configurando PHP-FPM..."
sudo tee /etc/php/8.3/fpm/pool.d/www.conf > /dev/null <<'EOF'
[www]
user = www-data
group = www-data
listen = /run/php/php8.4-fpm.sock
listen.owner = www-data
listen.group = www-data

pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
pm.max_requests = 500

php_admin_value[memory_limit] = 128M
php_admin_value[upload_max_filesize] = 20M
php_admin_value[post_max_size] = 20M
EOF
sudo systemctl enable php8.4-fpm --quiet
sudo systemctl restart php8.4-fpm
log "PHP-FPM configurado"

# ── 5. Copiar projeto ─────────────────────────────────────────────────────────
warn "[5/11] Copiando arquivos do projeto..."
sudo mkdir -p ${APP_DIR}
sudo cp -r ~/Escala/backend  ${APP_DIR}/
sudo cp -r ~/Escala/frontend ${APP_DIR}/
sudo chown -R www-data:www-data ${APP_DIR}
sudo find ${APP_DIR} -type f -exec chmod 644 {} \;
sudo find ${APP_DIR} -type d -exec chmod 755 {} \;
sudo chmod -R 775 ${APP_DIR}/backend/storage
sudo chmod -R 775 ${APP_DIR}/backend/bootstrap/cache
log "Arquivos copiados para ${APP_DIR}"

# ── 6. .env do Laravel ────────────────────────────────────────────────────────
warn "[6/11] Configurando .env do Laravel..."
PRODUCTION_URL="http://$(curl -s ifconfig.me)"
[ -n "$DOMAIN" ] && PRODUCTION_URL="https://${DOMAIN}"

sudo tee ${APP_DIR}/backend/.env > /dev/null <<EOF
APP_NAME="Ministério dos Acólitos"
APP_ENV=production
APP_KEY=base64:${APP_KEY}
APP_DEBUG=false
APP_URL=${PRODUCTION_URL}

LOG_CHANNEL=stack
LOG_LEVEL=error

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=${DB_NAME}
DB_USERNAME=${DB_USER}
DB_PASSWORD=${DB_PASS}

SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_STORE=database
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local

MAIL_MAILER=${MAIL_MAILER}
MAIL_FROM_ADDRESS="noreply@$([ -n "$DOMAIN" ] && echo "${DOMAIN}" || echo "localhost")"
MAIL_FROM_NAME="\${APP_NAME}"
POSTMARK_API_KEY=${POSTMARK_API_KEY}
RESEND_API_KEY=${RESEND_API_KEY}

GEMINI_API_KEY=${GEMINI_API_KEY}

EVOLUTION_API_URL=${EVOLUTION_API_URL}
EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
EVOLUTION_INSTANCE=${EVOLUTION_INSTANCE}
EOF

log ".env criado"

# ── 7. CORS ────────────────────────────────────────────────────────────────────
warn "[7/11] Atualizando CORS do Laravel..."
SERVER_IP=$(curl -s ifconfig.me)
CORS_ORIGIN="${PRODUCTION_URL}"

sudo tee ${APP_DIR}/backend/config/cors.php > /dev/null <<EOF
<?php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://${SERVER_IP}',
        'https://${SERVER_IP}',
        $([ -n "$DOMAIN" ] && echo "'https://${DOMAIN}'," || echo "")
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 86400,
    'supports_credentials' => false,
];
EOF
log "CORS configurado"

# ── 8. Laravel: instalar e migrar ────────────────────────────────────────────
warn "[8/11] Instalando dependências PHP e rodando migrations..."
cd ${APP_DIR}/backend
sudo -u www-data composer install --no-dev --optimize-autoloader --quiet --ignore-platform-reqs
sudo -u www-data php artisan migrate --force --seed
sudo -u www-data php artisan storage:link --force 2>/dev/null || true
sudo mkdir -p ${APP_DIR}/backend/storage/app/public/portal
sudo chown -R www-data:www-data ${APP_DIR}/backend/storage
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan route:cache
sudo -u www-data php artisan view:cache
log "Laravel configurado"

# ── 9. Cron do Laravel Scheduler ──────────────────────────────────────────────
warn "[9/11] Configurando cron do scheduler (lembretes, aniversários, etc)..."
CRON_LINE="* * * * * cd ${APP_DIR}/backend && php artisan schedule:run >> /dev/null 2>&1"
if (sudo -u www-data crontab -l 2>/dev/null | grep -vF "artisan schedule:run"; echo "$CRON_LINE") | sudo -u www-data crontab - 2>/tmp/cron_err; then
  log "Cron configurado (roda schedule:run a cada minuto como www-data)"
else
  echo -e "${YELLOW}[!] Não consegui configurar o cron automaticamente:${NC} $(cat /tmp/cron_err 2>/dev/null)"
  echo "    Rode manualmente: echo '${CRON_LINE}' | sudo -u www-data crontab -"
fi

# ── 10. Build do frontend ──────────────────────────────────────────────────────
warn "[10/11] Buildando React (pode demorar ~2 min)..."
cd ~/Escala/frontend
npm install --quiet
npm run build --quiet
sudo mkdir -p ${APP_DIR}/frontend/dist
sudo cp -r ~/Escala/frontend/dist/. ${APP_DIR}/frontend/dist/
sudo chown -R www-data:www-data ${APP_DIR}/frontend/dist
log "Frontend buildado em ${APP_DIR}/frontend/dist"

# ── 11. Nginx ─────────────────────────────────────────────────────────────────
warn "[11/11] Configurando Nginx..."
NGINX_SERVER_NAME="_"
[ -n "$DOMAIN" ] && NGINX_SERVER_NAME="${DOMAIN} www.${DOMAIN}"

sudo tee /etc/nginx/sites-available/escala > /dev/null <<EOF
server {
    listen 80;
    server_name ${NGINX_SERVER_NAME};
    client_max_body_size 20M;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1000;

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    # ── API Laravel ────────────────────────────────
    location ~ ^/(api|sanctum|up) {
        root ${APP_DIR}/backend/public;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
        fastcgi_param SCRIPT_FILENAME \$document_root/index.php;
        fastcgi_param SCRIPT_NAME /index.php;
        fastcgi_param REQUEST_URI \$request_uri;
        fastcgi_read_timeout 120;
        include fastcgi_params;
    }

    # ── Arquivos do storage Laravel ────────────────
    location /storage/ {
        alias ${APP_DIR}/backend/public/storage/;
        expires 30d;
        add_header Cache-Control "public";
        access_log off;
    }

    # ── React SPA ──────────────────────────────────
    location / {
        root ${APP_DIR}/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;

        # Cache assets com hash
        location ~* \.(js|css|woff2?|png|jpg|svg|ico)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
    }

    # Logs
    access_log /var/log/nginx/escala_access.log;
    error_log  /var/log/nginx/escala_error.log;
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/escala /etc/nginx/sites-enabled/escala
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx --quiet
log "Nginx configurado"

# ── Firewall ──────────────────────────────────────────────────────────────────
warn "Configurando firewall..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80  -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 22  -j ACCEPT 2>/dev/null || true
command -v netfilter-persistent &>/dev/null && sudo netfilter-persistent save 2>/dev/null || true

# ── SSL com Let's Encrypt (só se DOMAIN for definido) ────────────────────────
if [ -n "$DOMAIN" ]; then
  warn "Configurando SSL (Let's Encrypt)..."
  sudo certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --non-interactive --agree-tos --email "admin@${DOMAIN}" \
    --redirect 2>/dev/null && log "SSL configurado" || warn "SSL falhou — verifique se o DNS aponta para este servidor"
fi

# ── Salvar credenciais ────────────────────────────────────────────────────────
SERVER_IP=$(curl -s ifconfig.me)
sudo tee /root/credenciais-escala.txt > /dev/null <<EOF
===== SISTEMA ESCALAS LITÚRGICAS — CREDENCIAIS =====

URL do sistema:  http://${SERVER_IP}
$([ -n "$DOMAIN" ] && echo "Domínio:         https://${DOMAIN}")

Banco de dados:
  Host:     127.0.0.1
  Database: ${DB_NAME}
  User:     ${DB_USER}
  Password: ${DB_PASS}

Login inicial:
  Usuário:  master
  Senha:    master123  (altere após o primeiro acesso!)

Logs:
  Nginx:   /var/log/nginx/escala_error.log
  Laravel: ${APP_DIR}/backend/storage/logs/laravel.log

Redeploy:  bash ~/Escala/redeploy.sh
====================================================
EOF
sudo chmod 600 /root/credenciais-escala.txt

# ── Resultado final ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  URL:      ${YELLOW}http://${SERVER_IP}${NC}"
[ -n "$DOMAIN" ] && echo -e "  Domínio:  ${YELLOW}https://${DOMAIN}${NC}"
echo ""
echo -e "  Usuário:  ${YELLOW}master${NC}"
echo -e "  Senha:    ${YELLOW}master123${NC}"
echo ""
echo -e "  Credenciais salvas em: ${YELLOW}/root/credenciais-escala.txt${NC}"
echo ""
echo -e "  ${RED}IMPORTANTE:${NC} Libere as portas 80 e 443 no"
echo -e "  painel OCI → Networking → Security Lists"
echo ""
