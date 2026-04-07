#!/usr/bin/env bash
# ============================================================
# GrindLogger — VM Setup Script
# Targets: Ubuntu 22.04+ (AWS EC2, Oracle Cloud, etc.)
#
# Usage:
#   1. Clone or copy the repo to the VM
#   2. Fill in deploy/.env.production with your secrets
#   3. Run: bash deploy/setup.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== GrindLogger Production Setup ==="
echo "Project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

# --------------------------------------------------
# 1. Install Docker if not present
# --------------------------------------------------
if ! command -v docker &>/dev/null; then
    echo ">>> Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Allow current user to run docker without sudo
    sudo usermod -aG docker "$USER"
    echo ">>> Docker installed. You may need to log out and back in for group changes."
else
    echo ">>> Docker already installed: $(docker --version)"
fi

# --------------------------------------------------
# 2. Copy .env if not present
# --------------------------------------------------
if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$SCRIPT_DIR/.env.production" ]; then
        cp "$SCRIPT_DIR/.env.production" "$PROJECT_DIR/.env"
        echo ">>> Copied deploy/.env.production to .env"
        echo ">>> IMPORTANT: Edit .env and fill in your secrets before continuing!"
        echo ">>>   nano .env"
        exit 1
    else
        echo ">>> ERROR: No .env file found and no deploy/.env.production template."
        echo ">>>   Create .env in the project root with your production secrets."
        exit 1
    fi
else
    echo ">>> .env file found"
fi

# Verify required vars are set (not placeholder values)
source "$PROJECT_DIR/.env"
if [[ "${JWT_SECRET_KEY:-}" == "<generate-a-strong-secret>" || -z "${JWT_SECRET_KEY:-}" ]]; then
    echo ">>> ERROR: JWT_SECRET_KEY is not set in .env. Generate one with: openssl rand -hex 32"
    exit 1
fi

# --------------------------------------------------
# 3. Check SSL certificates
# --------------------------------------------------
if [ ! -f "$PROJECT_DIR/nginx/certs/cert.pem" ] || [ ! -f "$PROJECT_DIR/nginx/certs/key.pem" ]; then
    echo ">>> WARNING: SSL certificates not found in nginx/certs/"
    echo ">>>   Place your Cloudflare Origin Certificate files:"
    echo ">>>     nginx/certs/cert.pem  (certificate)"
    echo ">>>     nginx/certs/key.pem   (private key)"
    echo ">>>   See: Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate"
    exit 1
fi

# --------------------------------------------------
# 4. Open ports 80 & 443 (Oracle Cloud iptables)
# --------------------------------------------------
if [ -f "$SCRIPT_DIR/iptables.sh" ]; then
    echo ">>> Opening ports 80 & 443 (Oracle Cloud iptables)..."
    sudo bash "$SCRIPT_DIR/iptables.sh"
fi

# --------------------------------------------------
# 5. Build and start services
# --------------------------------------------------
echo ">>> Building and starting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# --------------------------------------------------
# 6. Wait for health checks
# --------------------------------------------------
echo ">>> Waiting for services to become healthy..."
ATTEMPTS=0
MAX_ATTEMPTS=30
until docker compose -f docker-compose.yml -f docker-compose.prod.yml ps --format json | \
      python3 -c "import sys,json; data=[json.loads(l) for l in sys.stdin]; sys.exit(0 if all(s.get('Health','')=='healthy' for s in data if s.get('Health')) else 1)" 2>/dev/null; do
    ATTEMPTS=$((ATTEMPTS + 1))
    if [ "$ATTEMPTS" -ge "$MAX_ATTEMPTS" ]; then
        echo ">>> WARNING: Not all services healthy after ${MAX_ATTEMPTS} attempts."
        echo ">>> Check logs: docker compose -f docker-compose.yml -f docker-compose.prod.yml logs"
        break
    fi
    echo "    Waiting... ($ATTEMPTS/$MAX_ATTEMPTS)"
    sleep 10
done

# --------------------------------------------------
# 7. Verify
# --------------------------------------------------
echo ""
echo "=== Deployment Summary ==="
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
echo ""

DOMAIN_NAME="${DOMAIN_NAME:-<your-domain>}"
echo ">>> Health check: curl https://$DOMAIN_NAME/api/health"
echo ">>> Frontend:     https://$DOMAIN_NAME"
echo ""
echo "=== Done! ==="
