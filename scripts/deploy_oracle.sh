#!/usr/bin/env bash
# ==============================================================================
# One-Click Setup Script for Oracle Cloud Always Free VM (Ubuntu 22.04 / 24.04)
# 4 ARM vCPUs (Ampere A1) + 24GB RAM - 100% Free Forever
# ==============================================================================

set -e

echo "=== 1. Updating System Packages ==="
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release git

echo "=== 2. Installing Docker Engine ==="
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER

echo "=== 3. Opening Oracle VM Firewall Ports (80, 443, 8000) ==="
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8000 -j ACCEPT
sudo netfilter-persistent save || true

echo "=== 4. Setting up ScenarioLab Backend Service ==="
APP_DIR="/opt/scenariolab"
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

if [ ! -d "$APP_DIR/.git" ]; then
    git clone https://github.com/G-Narendra/Scenario-Training.git $APP_DIR
else
    cd $APP_DIR && git pull origin master
fi

cd $APP_DIR

echo "=== 5. Building and Launching High-Concurrency Container ==="
docker build -t scenariolab-backend:latest .

# Run with 4 Gunicorn/Uvicorn workers on port 8000
docker stop scenariolab-backend || true
docker rm scenariolab-backend || true

docker run -d \
  --name scenariolab-backend \
  --restart always \
  -p 8000:8000 \
  --env-file .env \
  scenariolab-backend:latest

echo "=== 6. Verifying Health Check ==="
sleep 5
curl -f http://127.0.0.1:8000/health/ready && echo " -> Backend is alive on Oracle Cloud!"
