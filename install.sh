#!/bin/bash
# install.sh
# Overhauled Robust Production Installer for ScheduleLab
# Handles remote IPs, interactive credentials, and safe configuration injection.

set -e

echo "========================================================="
echo "    ScheduleLab Robust Production Installer             "
echo "========================================================="
echo "WARNING: This script will configure your production stack."
echo "Ensure ports 80, 443, 3000, 5432, 6543, and 8000 are open."
echo "========================================================="

# 0. Clean Slate Option
echo ""
read -p "    [CLEAN SLATE] Would you like to factory reset (DELETE ALL VOLUMES/DATA)? [y/N]: " NUKE_IT
if [[ "$NUKE_IT" =~ ^[Yy]$ ]]; then
    echo "    Wiping all persistent data..."
    docker compose -f docker-compose.prod.yml down -v --remove-orphans || true
    rm -rf .env
    echo "    Cleanup complete."
fi

# 1. Collection of Deployment Info
echo ""
echo "[1/4] Collection Deployment Configuration..."
read -p "    Enter your Server Public IP or Domain (e.g., 1.2.3.4): " SERVER_URL
if [ -z "$SERVER_URL" ]; then
    echo "    ERROR: Server URL is required for remote deployment."
    exit 1
fi
# Clean protocol if user entered it
SERVER_URL=$(echo "$SERVER_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')

echo ""
echo "    Setting up Supabase Studio Dashboard Credentials..."
read -p "    Enter Dashboard Username [default: supabase]: " NEW_DASH_USER
NEW_DASH_USER=${NEW_DASH_USER:-supabase}

read -p "    Enter Dashboard Password (leave blank to autogenerate): " NEW_DASH_PASS
if [ -z "$NEW_DASH_PASS" ]; then
    NEW_DASH_PASS=$(openssl rand -base64 16 | tr -d '\n\r/' | cut -c 1-20)
    echo "    Generated secure password: $NEW_DASH_PASS"
fi

# 2. Prerequisites
echo ""
echo "[2/4] Installing dependencies..."
sudo apt update && sudo apt install -y curl git jq openssl python3

# 3. Environment & Secret Generation
echo ""
echo "[3/4] Generating Environment Secret Keys..."
if [ ! -f .env ]; then
    echo "    Creating new .env..."
    cp .supabase-docker/.env.example .env
    
    # Generate secrets
    NEW_PG_PASS=$(openssl rand -base64 24 | tr -d '\n\r/' | cut -c 1-20)
    NEW_JWT_SECRET=$(openssl rand -hex 32)
    NEW_LOGFLARE_PUB=$(openssl rand -hex 16)
    NEW_LOGFLARE_PRIV=$(openssl rand -hex 16)
    NEW_SECRET_KEY_BASE=$(openssl rand -base64 48 | tr -d '\n\r')
    NEW_VAULT_ENC_KEY=$(openssl rand -hex 16)
    NEW_PG_META_CRYPTO=$(openssl rand -hex 16)
    NEW_S3_ID=$(openssl rand -hex 16)
    NEW_S3_SECRET=$(openssl rand -hex 32)
    
    # Using python for safe JWT generation
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

    # Update .env
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$NEW_PG_PASS|" .env
    sed -i "s|^DASHBOARD_USERNAME=.*|DASHBOARD_USERNAME=$NEW_DASH_USER|" .env
    sed -i "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=$NEW_DASH_PASS|" .env
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$NEW_JWT_SECRET|" .env
    sed -i "s|^ANON_KEY=.*|ANON_KEY=$NEW_ANON_KEY|" .env
    sed -i "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$NEW_SERVICE_ROLE_KEY|" .env
    sed -i "s|^LOGFLARE_PUBLIC_ACCESS_TOKEN=.*|LOGFLARE_PUBLIC_ACCESS_TOKEN=$NEW_LOGFLARE_PUB|" .env
    sed -i "s|^LOGFLARE_PRIVATE_ACCESS_TOKEN=.*|LOGFLARE_PRIVATE_ACCESS_TOKEN=$NEW_LOGFLARE_PRIV|" .env
    sed -i "s|^SECRET_KEY_BASE=.*|SECRET_KEY_BASE=$NEW_SECRET_KEY_BASE|" .env
    sed -i "s|^VAULT_ENC_KEY=.*|VAULT_ENC_KEY=$NEW_VAULT_ENC_KEY|" .env
    sed -i "s|^PG_META_CRYPTO_KEY=.*|PG_META_CRYPTO_KEY=$NEW_PG_META_CRYPTO|" .env
    sed -i "s|^S3_PROTOCOL_ACCESS_KEY_ID=.*|S3_PROTOCOL_ACCESS_KEY_ID=$NEW_S3_ID|" .env
    sed -i "s|^S3_PROTOCOL_ACCESS_KEY_SECRET=.*|S3_PROTOCOL_ACCESS_KEY_SECRET=$NEW_S3_SECRET|" .env
    
    # Detect Docker socket
    DOCKER_SOCKET="/var/run/docker.sock"
    if [ ! -S "$DOCKER_SOCKET" ] && [ -S "/run/docker.sock" ]; then DOCKER_SOCKET="/run/docker.sock"; fi
    sed -i "s|^DOCKER_SOCKET_LOCATION=.*|DOCKER_SOCKET_LOCATION=$DOCKER_SOCKET|" .env

    # Custom variables
    echo "NEXT_PUBLIC_SUPABASE_URL=http://$SERVER_URL:8000" >> .env
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEW_ANON_KEY" >> .env
    echo "NEXT_PUBLIC_SITE_URL=http://$SERVER_URL:3000" >> .env
    echo "POSTGRES_USER=postgres" >> .env
    echo "DATABASE_URL=postgres://postgres:$NEW_PG_PASS@db:5432/postgres" >> .env
    echo "    Environment variables configured for $SERVER_URL."
else
    echo "    .env exists. Using existing configuration."
    NEW_DASH_USER=$(grep DASHBOARD_USERNAME .env | cut -d'=' -f2)
    NEW_DASH_PASS=$(grep DASHBOARD_PASSWORD .env | cut -d'=' -f2)
fi

# 4. Safe Configuration Injection (Kong)
echo ""
echo "[4/4] Injecting credentials into services..."
cat << 'EOF' > inject_configs.py
import sys, os
def replace_in_file(path, search, replace):
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    content = content.replace(search, replace)
    with open(path, 'w') as f: f.write(content)

user = sys.argv[1]
pw = sys.argv[2]
replace_in_file('.supabase-docker/volumes/api/kong.yml', '{{DASHBOARD_USERNAME}}', user)
replace_in_file('.supabase-docker/volumes/api/kong.yml', '{{DASHBOARD_PASSWORD}}', pw)
EOF
python3 inject_configs.py "$NEW_DASH_USER" "$NEW_DASH_PASS"
rm inject_configs.py

# Fix Vector config
if [ -d ".supabase-docker/volumes/logs/vector.yml" ]; then rm -rf ".supabase-docker/volumes/logs/vector.yml"; fi
chmod +x compile_schema.sh && ./compile_schema.sh

echo ""
echo "    Starting Docker Stack..."
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

# 5. Bootstrap
echo ""
echo "[5/5] Finalizing Database..."
MAX_RETRIES=30
COUNT=0
until docker exec supabase-db pg_isready -U postgres >/dev/null 2>&1 || [ $COUNT -eq $MAX_RETRIES ]; do
    echo "    Waiting for DB ($((COUNT+1))/$MAX_RETRIES)..."
    sleep 2
    COUNT=$((COUNT+1))
done

if [ $COUNT -eq $MAX_RETRIES ]; then
    echo "    ERROR: DB timed out."
else
    # Sync passwords and bootstrap schemas
    SYNC_PASS=$(grep "^POSTGRES_PASSWORD=" .env | cut -d'=' -f2)
    echo "    Syncing internal passwords..."
    for u in postgres supabase_admin authenticator pgbouncer supabase_auth_admin supabase_functions_admin supabase_storage_admin; do
        docker exec supabase-db psql -U postgres -c "ALTER ROLE $u WITH PASSWORD '$SYNC_PASS';" >/dev/null 2>&1 || true
    done

    echo "    Creating internal schemas..."
    docker exec supabase-db psql -U postgres -c "CREATE DATABASE _supabase;" >/dev/null 2>&1 || true
    docker exec supabase-db psql -U postgres -d _supabase -c "CREATE SCHEMA IF NOT EXISTS _analytics;" >/dev/null 2>&1 || true
    docker exec supabase-db psql -U postgres -d _supabase -c "GRANT ALL ON SCHEMA _analytics TO supabase_admin; GRANT ALL ON SCHEMA public TO supabase_admin;" >/dev/null 2>&1 || true
    
    echo "    Injecting Admin Account..."
    ADMIN_SQL=$(cat <<EOF
CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO \$\$
DECLARE
    uid UUID;
BEGIN
    SELECT id INTO uid FROM auth.users WHERE email = 'admin@schedulelab.com';
    IF uid IS NULL THEN
        INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'admin@schedulelab.com', crypt('ScheduleLabAdmin2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
        RETURNING id INTO uid;
    ELSE
        UPDATE auth.users SET encrypted_password = crypt('ScheduleLabAdmin2026!', gen_salt('bf')), updated_at = now() WHERE id = uid;
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'ADMIN') ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';
END \$\$;
EOF
)
    docker exec supabase-db psql -U postgres -c "$ADMIN_SQL" >/dev/null 2>&1 || true
fi

echo ""
echo "========================================================="
echo "    DEPLOYMENT COMPLETE"
echo "========================================================="
echo "    ScheduleLab:     http://$SERVER_URL:3000"
echo "    Admin Email:     admin@schedulelab.com"
echo "    Admin Pass:      ScheduleLabAdmin2026!"
echo ""
echo "    Supabase Studio: http://$SERVER_URL:8000"
echo "    Studio User:     $NEW_DASH_USER"
echo "    Studio Pass:     $NEW_DASH_PASS"
echo "========================================================="
