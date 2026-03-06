#!/bin/bash
# install.sh
# Automated Production Setup Script for ScheduleLab with full Supabase integration
# Requirements: Ubuntu 22.04 LTS (or similar) with Docker installed

set -e

echo "========================================================="
echo "    ScheduleLab Automated Production Installer          "
echo "========================================================="
echo "WARNING: This script will auto-generate secure passwords and JWT secrets,"
echo "install Docker (if missing), and deploy the full stack."
echo "Please ensure ports 80, 443, 3000, 5432, 6543, and 8000 are not blocked."
echo "========================================================="
read -p "Press ENTER to begin or Ctrl+C to cancel..." 

# 1. Update and install dependencies
echo ""
echo "[1/4] Updating system packages & installing prerequisites..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl vim git apt-transport-https ca-certificates software-properties-common jq openssl

# Optional: Server Hardening
echo ""
read -p "    Apply basic Debian hardening (UFW, Fail2Ban, Unattended Upgrades)? [y/N]: " APPLY_HARDENING
if [[ "$APPLY_HARDENING" =~ ^[Yy]$ ]]; then
    echo "    Hardening server..."
    # UFW
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow http
    sudo ufw allow https
    sudo ufw allow 8000
    echo "y" | sudo ufw enable
    
    # Fail2Ban & Updates
    sudo apt install -y fail2ban unattended-upgrades
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    echo "    Hardening complete."
fi

# 2. Install Docker & Docker Compose if not present
if ! command -v docker &> /dev/null; then
    echo "[2/4] Installing Docker..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    echo "    Docker installed successfully. (You may need to log out and log back in for group changes to take effect)"
else
    echo "[2/4] Docker is already installed. Skipping."
fi

# 3. Environment Configuration & Secret Generation
echo "[3/4] Generating Secure Environment Keys..."

# Helper function to generate a random 40-char JWT hex secret
generate_jwt_secret() {
    openssl rand -hex 32
}

# Ensure '.env' file exists by copying the Supabase base example, then appending custom NEXT values
if [ ! -f .env ]; then
    echo "    Creating new .env from templates..."
    cp .supabase-docker/.env.example .env

    # Generate core secrets
    NEW_PG_PASS=$(openssl rand -base64 24 | tr -d '\n\r/' | cut -c 1-20)
    NEW_JWT_SECRET=$(generate_jwt_secret)
    NEW_DASH_PASS=$(openssl rand -base64 16 | tr -d '\n\r/')
    
    # Using Supabase's provided way to generate valid JWTs for Anon/Service from a secret
    # If the user doesn't have local Node.js or signing capability, we can construct standard ones here
    # However, generating true JWTs securely requires a signing header. 
    # For standalone, we can use simple shell-signed tokens via openssl if required, or simply pass the secret
    # Supabase allows overriding using standard generated JWTs if we construct them.
    # To keep this script universally compatible without NPM present on the host yet, 
    # we'll use a python one-liner (Python 3 is default on Ubuntu) to generate proper JWTs.
    
    cat << 'EOF' > generate_jwt.py
import sys, hmac, hashlib, base64, json, time
secret = sys.argv[1].encode('utf-8')
role = sys.argv[2]
header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode('utf-8')).decode('utf-8').rstrip("=")
payload = base64.urlsafe_b64encode(json.dumps({
    "role": role,
    "iss": "supabase",
    "iat": int(time.time()),
    "exp": int(time.time()) + 315360000  # 10 years
}).encode('utf-8')).decode('utf-8').rstrip("=")
signature = base64.urlsafe_b64encode(hmac.new(secret, f"{header}.{payload}".encode('utf-8'), hashlib.sha256).digest()).decode('utf-8').rstrip("=")
print(f"{header}.{payload}.{signature}")
EOF

    NEW_ANON_KEY=$(python3 generate_jwt.py "$NEW_JWT_SECRET" "anon")
    NEW_SERVICE_ROLE_KEY=$(python3 generate_jwt.py "$NEW_JWT_SECRET" "service_role")
    rm generate_jwt.py

    # Replace generated variables in .env
    sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$NEW_PG_PASS/" .env
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env
    sed -i "s/^ANON_KEY=.*/ANON_KEY=$NEW_ANON_KEY/" .env
    sed -i "s/^SERVICE_ROLE_KEY=.*/SERVICE_ROLE_KEY=$NEW_SERVICE_ROLE_KEY/" .env
    sed -i "s/^DASHBOARD_PASSWORD=.*/DASHBOARD_PASSWORD=$NEW_DASH_PASS/" .env
    
    # Append Custom Next.js & Proxy variables
    echo "" >> .env
    echo "# -------------------------" >> .env
    echo "# Custom Platform Variables" >> .env
    echo "# -------------------------" >> .env
    echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000" >> .env
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEW_ANON_KEY" >> .env
    echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" >> .env
    echo "NODE_ENV=production" >> .env
    echo "PORT=3000" >> .env
    echo "DATABASE_URL=postgres://postgres:$NEW_PG_PASS@db:5432/postgres" >> .env

    echo "    Generated new secure passwords and JWTs."
else
    echo "    .env already exists. Skipping secret generation to prevent overwriting."
fi

# 4. Starting Services
echo "[4/4] Starting Full Docker Stack..."
# Build the schema file into the volume location
echo "    Compiling Schema..."
chmod +x compile_schema.sh && ./compile_schema.sh

# Run docker-compose pointing to the production file
echo "    Deploying containers..."
docker compose -f docker-compose.prod.yml up -d --build

echo "========================================================="
echo "    Installation Complete!                               "
echo "    ScheduleLab is starting up. It may take up to 2     "
echo "    minutes for the database to fully initialize and    "
echo "    run the schema scripts for the first time.          "
echo "                                                         "
echo "    Access the platform:   http://localhost:3000         "
echo "    Access Supabase Studio: http://localhost:8000        "
echo "                                                         "
echo "    Check status with: docker compose ps                 "
echo "========================================================="
