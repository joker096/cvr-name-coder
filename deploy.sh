#!/bin/bash
# cvr.name.coder — Self-Hosting Deployment Gateway
# Usage: bash deploy.sh [up|down|logs|status]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_prereqs() {
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Install: https://docs.docker.com/get-docker/"
    exit 1
  fi
  if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    exit 1
  fi
}

show_banner() {
  echo -e "${GREEN}"
  echo "  ╔════════════════════════════════════╗"
  echo "  ║     cvr.name.coder Gateway        ║"
  echo "  ║  Autonomous AI Coding Agent       ║"
  echo "  ╚════════════════════════════════════╝"
  echo -e "${NC}"
}

generate_nginx_conf() {
  cat > nginx-dashboard.conf << 'NGINX'
server {
    listen 80;
    server_name localhost;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer" always;

    location /api/ {
        proxy_pass http://cvr:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://cvr:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
NGINX
}

cmd_up() {
  echo -e "${YELLOW}Checking prerequisites...${NC}"
  check_prereqs
  generate_nginx_conf

  if [ -f .env ]; then
    echo -e "${GREEN}Loading .env file...${NC}"
    set -a; source .env; set +a
  else
    echo -e "${YELLOW}No .env file found. Create one with your API keys:${NC}"
    echo "  GEMINI_API_KEY=your_key_here"
    echo "  OPENAI_API_KEY=your_key_here"
    echo -e "${YELLOW}Continuing without .env — set keys via environment.${NC}"
  fi

  echo -e "${GREEN}Building and starting cvr.name.coder...${NC}"
  docker compose up -d cvr

  echo ""
  echo -e "${GREEN}Waiting for health check...${NC}"
  for i in $(seq 1 30); do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
      echo -e "${GREEN}Server is healthy! ✓${NC}"
      echo ""
      echo "  📍 API:         http://localhost:3000/api"
      echo "  🩺 Health:      http://localhost:3000/api/health"
      echo "  🖥️  Dashboard:   http://localhost:3000"
      echo ""
      echo "  Dashboard with reverse proxy:"
      echo "    docker compose --profile dashboard up -d"
      echo "    → http://localhost:8080"
      break
    fi
    sleep 2
  done
}

cmd_dashboard() {
  check_prereqs
  echo -e "${GREEN}Starting with Dashboard proxy...${NC}"
  generate_nginx_conf
  docker compose --profile dashboard up -d
  echo ""
  echo "  🖥️  Dashboard:   http://localhost:8080"
  echo "  📍 Direct API:   http://localhost:3000/api"
}

cmd_down() {
  echo -e "${YELLOW}Stopping all services...${NC}"
  docker compose --profile dashboard down
  rm -f nginx-dashboard.conf
  echo -e "${GREEN}Done.${NC}"
}

cmd_logs() {
  docker compose logs -f --tail=100
}

cmd_status() {
  echo -e "${GREEN}Container status:${NC}"
  docker compose ps
  echo ""
  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}Health: $(curl -s http://localhost:3000/api/health)${NC}"
  else
    echo -e "${RED}Server not responding${NC}"
  fi
}

show_usage() {
  echo "Usage: bash deploy.sh [command]"
  echo ""
  echo "Commands:"
  echo "  up          Start cvr.name.coder"
  echo "  dashboard   Start with web dashboard proxy"
  echo "  down        Stop all services"
  echo "  logs        View logs"
  echo "  status      Show status"
  echo ""
  echo "First time setup:"
  echo "  1. cp .env.example .env"
  echo "  2. Add your AI provider API keys to .env"
  echo "  3. bash deploy.sh up"
}

show_banner

case "${1:-up}" in
  up)        cmd_up ;;
  dashboard) cmd_dashboard ;;
  down)      cmd_down ;;
  logs)      cmd_logs ;;
  status)    cmd_status ;;
  *)         show_usage ;;
esac
