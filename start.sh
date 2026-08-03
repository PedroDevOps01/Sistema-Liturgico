#!/bin/bash
# Sistema de Escalas Litúrgicas - Script de inicialização

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Iniciando Sistema de Escalas Litúrgicas..."

# Start Laravel backend
echo "[1/2] Iniciando backend Laravel (porta 8000)..."
cd "$SCRIPT_DIR/backend"
php artisan serve --host=127.0.0.1 --port=8000 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

sleep 2

# Start React frontend
echo "[2/2] Iniciando frontend React (porta 5173)..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "Sistema iniciado!"
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:8000/api"
echo ""
echo "Login padrão:"
echo "  Usuário: master"
echo "  Senha: master123"
echo ""
echo "Para parar: Ctrl+C"

# Wait for interrupt
wait $BACKEND_PID $FRONTEND_PID
