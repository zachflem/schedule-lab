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

    NEW_PG_PASS=$(openssl rand -base64 24 | tr -d '\n\r/' | cut -c 1-20)
    NEW_JWT_SECRET=$(generate_jwt_secret)
    
    echo "    Setting up Supabase Studio Dashboard Credentials..."
    read -p "    Enter Dashboard Username [default: supabase]: " NEW_DASH_USER
    NEW_DASH_USER=${NEW_DASH_USER:-supabase}
    
    read -p "    Enter Dashboard Password (leave blank to autogenerate): " NEW_DASH_PASS
    if [ -z "$NEW_DASH_PASS" ]; then
        NEW_DASH_PASS=$(openssl rand -base64 16 | tr -d '\n\r/' | cut -c 1-20)
        echo "    Generated secure password: $NEW_DASH_PASS"
    fi
    NEW_LOGFLARE_PUB=$(openssl rand -hex 16)
    NEW_LOGFLARE_PRIV=$(openssl rand -hex 16)
    NEW_SECRET_KEY_BASE=$(openssl rand -base64 48 | tr -d '\n\r')
    NEW_VAULT_ENC_KEY=$(openssl rand -hex 16)
    NEW_PG_META_CRYPTO=$(openssl rand -hex 16)
    NEW_S3_ID=$(openssl rand -hex 16)
    NEW_S3_SECRET=$(openssl rand -hex 32)
    
    # Detect Docker socket location
    DOCKER_SOCKET="/var/run/docker.sock"
    if [ ! -S "$DOCKER_SOCKET" ] && [ -S "/run/docker.sock" ]; then
        DOCKER_SOCKET="/run/docker.sock"
    fi
    
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
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$NEW_PG_PASS|" .env
    if grep -q "^POSTGRES_USER=" .env; then
        sed -i "s|^POSTGRES_USER=.*|POSTGRES_USER=postgres|" .env
    else
        echo "POSTGRES_USER=postgres" >> .env
    fi
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$NEW_JWT_SECRET|" .env
    sed -i "s|^ANON_KEY=.*|ANON_KEY=$NEW_ANON_KEY|" .env
    sed -i "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$NEW_SERVICE_ROLE_KEY|" .env
    
    # Update Dashboard User/Pass
    if grep -q "^DASHBOARD_USERNAME=" .env; then
        sed -i "s|^DASHBOARD_USERNAME=.*|DASHBOARD_USERNAME=$NEW_DASH_USER|" .env
    else
        echo "DASHBOARD_USERNAME=$NEW_DASH_USER" >> .env
    fi
    sed -i "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=$NEW_DASH_PASS|" .env
    
    sed -i "s|^LOGFLARE_PUBLIC_ACCESS_TOKEN=.*|LOGFLARE_PUBLIC_ACCESS_TOKEN=$NEW_LOGFLARE_PUB|" .env
    sed -i "s|^LOGFLARE_PRIVATE_ACCESS_TOKEN=.*|LOGFLARE_PRIVATE_ACCESS_TOKEN=$NEW_LOGFLARE_PRIV|" .env
    sed -i "s|^SECRET_KEY_BASE=.*|SECRET_KEY_BASE=$NEW_SECRET_KEY_BASE|" .env
    sed -i "s|^VAULT_ENC_KEY=.*|VAULT_ENC_KEY=$NEW_VAULT_ENC_KEY|" .env
    sed -i "s|^PG_META_CRYPTO_KEY=.*|PG_META_CRYPTO_KEY=$NEW_PG_META_CRYPTO|" .env
    sed -i "s|^S3_PROTOCOL_ACCESS_KEY_ID=.*|S3_PROTOCOL_ACCESS_KEY_ID=$NEW_S3_ID|" .env
    sed -i "s|^S3_PROTOCOL_ACCESS_KEY_SECRET=.*|S3_PROTOCOL_ACCESS_KEY_SECRET=$NEW_S3_SECRET|" .env
    sed -i "s|^DOCKER_SOCKET_LOCATION=.*|DOCKER_SOCKET_LOCATION=$DOCKER_SOCKET|" .env
    
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

# Fix Vector config if it was created as a directory by Docker
if [ -d ".supabase-docker/volumes/logs/vector.yml" ]; then
    echo "    Fixing Vector config (removing directory shadowing file)..."
    rm -rf ".supabase-docker/volumes/logs/vector.yml"
fi

# Build the schema file into the volume location
echo "    Compiling Schema..."
chmod +x compile_schema.sh && ./compile_schema.sh

# Run docker-compose pointing to the production file
echo "    Deploying Core Database..."
docker compose -f docker-compose.prod.yml up -d db vector --build --remove-orphans

# 5. Bootstrapping Database (Ensuring _supabase exists for Analytics)
echo "[5/5] Bootstrapping Database..."
# Wait for DB to be ready
MAX_RETRIES=30
COUNT=0
until docker exec supabase-db pg_isready -U postgres >/dev/null 2>&1 || [ $COUNT -eq $MAX_RETRIES ]; do
    echo "    Waiting for Database to be ready ($((COUNT+1))/$MAX_RETRIES)..."
    sleep 2
    COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
    echo "    ERROR: Database failed to start in time. Check 'docker logs supabase-db'."
else
    # Get password from .env for syncing
    SYNC_PASS=$(grep "^POSTGRES_PASSWORD=" .env | cut -d'=' -f2)

    echo "    Syncing Database passwords..."
    # Update roles to match .env to prevent authentication failures on re-runs
    for db_user in postgres supabase_admin authenticator pgbouncer supabase_auth_admin supabase_functions_admin supabase_storage_admin; do
        docker exec supabase-db psql -U postgres -c "ALTER ROLE $db_user WITH PASSWORD '$SYNC_PASS';" >/dev/null 2>&1 || true
    done

    echo "    Creating _supabase internal database..."
    docker exec supabase-db psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname = '_supabase'" | grep -q 1 || \
    docker exec supabase-db psql -U postgres -c "CREATE DATABASE _supabase;"
    
    echo "    Initializing internal schemas..."
    docker exec supabase-db psql -U postgres -d _supabase -c "CREATE SCHEMA IF NOT EXISTS _analytics;" >/dev/null 2>&1 || true
    docker exec supabase-db psql -U postgres -d _supabase -c "GRANT ALL ON SCHEMA _analytics TO supabase_admin;" >/dev/null 2>&1 || true
    docker exec supabase-db psql -U postgres -d _supabase -c "GRANT ALL ON SCHEMA public TO supabase_admin;" >/dev/null 2>&1 || true

    echo "    Ensuring Admin Account..."
    # Explicitly create or update the admin user to ensure login works
    ADMIN_SQL=$(cat <<EOF
DO \$\$
DECLARE
    new_user_id UUID;
BEGIN
    -- Check if user exists
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'admin@schedulelab.com';

    IF new_user_id IS NULL THEN
        -- Create user
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
            confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            'admin@schedulelab.com', crypt('ScheduleLabAdmin2026!', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
        ) RETURNING id INTO new_user_id;
    ELSE
        -- Update password to ensure it matches
        UPDATE auth.users 
        SET encrypted_password = crypt('ScheduleLabAdmin2026!', gen_salt('bf')),
            updated_at = now()
        WHERE id = new_user_id;
    END IF;

    -- Ensure ADMIN role in user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'ADMIN')
    ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';

END \$\$;
EOF
)
    docker exec supabase-db psql -U postgres -c "$ADMIN_SQL" >/dev/null 2>&1 || true
    
    echo "    Deploying Full Stack..."
    docker compose -f docker-compose.prod.yml up -d
fi

echo "========================================================="
echo "    Installation Complete!                               "
echo "    ScheduleLab is starting up. It may take up to 2     "
echo "    minutes for the database to fully initialize and    "
echo "    run the schema scripts for the first time.          "
echo "                                                         "
echo "    Access the platform:   http://localhost:3000         "
echo "    Admin Account:         admin@schedulelab.com         "
echo "    Admin Password:        ScheduleLabAdmin2026!         "
echo "                                                         "
echo "    Access Supabase Studio: http://localhost:8000        "
echo "    Dashboard User:         $(grep DASHBOARD_USERNAME .env | cut -d'=' -f2)"
echo "    Dashboard Password:     $(grep DASHBOARD_PASSWORD .env | cut -d'=' -f2)"
echo "                                                         "
echo "    Check status with: docker compose ps                 "
echo "========================================================="
