#!/bin/bash
# =============================================================================
# Envia o código do Mac para o servidor OCI e faz deploy/redeploy
# =============================================================================
# Uso:
#   Primeiro deploy:  bash upload.sh <IP_DO_SERVIDOR> deploy
#   Atualização:      bash upload.sh <IP_DO_SERVIDOR> update
# =============================================================================

SERVER_IP="${1:-}"
MODE="${2:-update}"        # deploy | update
SSH_KEY="${3:-}"           # opcional: caminho da chave SSH

if [ -z "$SERVER_IP" ]; then
  echo "Uso: bash upload.sh <IP> [deploy|update] [chave_ssh]"
  echo "Ex:  bash upload.sh 137.131.190.99 deploy ~/Downloads/ssh-key-2026-06-18.key"
  exit 1
fi

SSH_OPTS="-o StrictHostKeyChecking=no"
[ -n "$SSH_KEY" ] && SSH_OPTS="-i ${SSH_KEY} ${SSH_OPTS}"

YELLOW='\033[1;33m'; GREEN='\033[0;32m'; NC='\033[0m'
warn() { echo -e "${YELLOW}[>>]${NC} $1"; }
log()  { echo -e "${GREEN}[OK]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

warn "Enviando código para ubuntu@${SERVER_IP}..."

rsync -avz --progress -e "ssh ${SSH_OPTS}" \
  --exclude='backend/vendor/' \
  --exclude='backend/.env' \
  --exclude='backend/storage/logs/*.log' \
  --exclude='frontend/node_modules/' \
  --exclude='frontend/dist/' \
  --exclude='.git/' \
  --exclude='backend/storage/app/public/' \
  --exclude='*.pdf' \
  "${SCRIPT_DIR}/" \
  "ubuntu@${SERVER_IP}:~/Escala/"

log "Código enviado"

if [ "$MODE" = "deploy" ]; then
  warn "Executando deploy completo..."
  ssh ${SSH_OPTS} "ubuntu@${SERVER_IP}" "bash ~/Escala/deploy.sh"
else
  warn "Executando redeploy..."
  ssh ${SSH_OPTS} "ubuntu@${SERVER_IP}" "bash ~/Escala/redeploy.sh"
fi
