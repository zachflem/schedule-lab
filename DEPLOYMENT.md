# ScheduleLab Deployment Guide

This guide explains how to deploy ScheduleLab to a standalone production server (VPS) such as Linode, DigitalOcean, or AWS EC2 running Ubuntu 22.04 LTS (or newer).

## Prerequisites
- A fresh Ubuntu Linux server with root or sudo access.
- At least 2GB of RAM (4GB+ recommended) for running the full Next.js and Supabase ecosystem.
- A domain name pointing to your server's IP address (optional, but requested for production SSL).
- **Ports 80, 443, 8000** must be open on your VPS firewall.

## Security & Hardening (Debian/Ubuntu)
If this VPS is dedicated solely to ScheduleLab, it is highly recommended to apply these basic hardening steps before proceeding with the installation.

### 1. Firewall (UFW)
Restrict all incoming traffic except for essential services:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh          # Port 22
sudo ufw allow http         # Port 80
sudo ufw allow https        # Port 443
sudo ufw allow 8000         # Supabase Studio (Optional: restrict to your IP)
sudo ufw enable
```

### 2. Intrusion Prevention (Fail2Ban)
Protect against brute-force attacks by installing Fail2Ban:
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Automatic Security Updates
Ensure your system stays patched against OS-level vulnerabilities:
```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 4. Create Non-Root User
It is a security best practice to avoid operating as `root`. Create a new user with sudo privileges:
```bash
sudo adduser <your_username>
sudo usermod -aG sudo <your_username>
sudo usermod -aG docker <your_username>
```
Now, log out and log back in as your new user before continuing. This allows you to run Docker commands without `sudo`.

### 5. SSH Hardening (Recommendation)
Edit `/etc/ssh/sshd_config` to disable root login while retaining password access for your new user:
- `PermitRootLogin no`
- `PasswordAuthentication yes` (Ensure this remains 'yes' for password access)

Then run `sudo systemctl restart ssh`.

## Architecture
The system is deployed using **Docker Compose** encompassing the full Supabase backend stack and an NGINX reverse proxy.
- `nginx`: Reverse proxy handling traffic on Port 80, routing to Web or API.
- `web`: The Next.js Production Application running via `output: 'standalone'`.
- `kong` / `auth` / `rest`: The Supabase API services handling authentication and database REST/GraphQL requests.
- `db`: The official Supabase PostgreSQL image with the pre-compiled `00-schedulelab-schema.sql`.

## 1-Click Installation Steps

1. **Clone the Repository**
   SSH into your production server and clone the project:
   ```bash
   git clone https://your-repository-url.com/schedule-lab.git
   cd schedule-lab
   ```

2. **Run the Installer Script**
   An `install.sh` script is provided to fully automate the Docker installation, cryptographic secret generation, and environment setup.
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
   **What the script does:**
   - Installs Docker if missing.
   - Generates a crypto-secure 40+ character `JWT_SECRET`.
   - Uses that secret to cryptographically sign a secure `ANON_KEY` and `SERVICE_ROLE_KEY`.
   - Generates secure random passwords for the Postgres DB and Supabase Dashboard.
   - Triggers the `compile_schema.sh` script, which builds the single comprehensive database initialization SQL file.
   - Spins up the entire architecture using `docker-compose.prod.yml`.

## Post-Installation

### 1. Wait for Initialization
When the script finishes, the containers will be live, but the PostgreSQL database will take 1-2 minutes to initialize the schema for the very first time. Be patient.

### 2. Administrator Access
To access the system, open your web browser to your Server's IP address (which hits NGINX on Port 80, proxying to Next.js).
If this is a fresh database, you must register a new user in the Supabase backend.
By default, the first user you create on your local development instance was boosted to the `Administrator` role by the `bootstrap_admin` function.
If you restore a backup from your local database, you will retain admin access. Ensure you navigate to `http://<your-server-ip>/settings/system` immediately to configure your global System Email and Branding.

### 3. Database Management
Only users who possess the Admin role inside the application can see the **Supabase Studio** link on the `External Links` page. This Studio will be externally hosted on `http://<your-server-ip>:8000`. 
Your randomly generated Studio password is saved in your generated `.env` file under `DASHBOARD_PASSWORD`.

## Backup and Restore
The ScheduleLab application has an automated Backup & Restore UI available in the **Settings** panel for Admin users.
- **Backup:** Generates a full `.sql` snapshot of the database securely bypassing the proxy limits.
- **Restore:** Replaces the current `public` schema with the uploaded `.sql` file. *Requires confirmation text validation.*
- **System Level Backups:** For total safety, you should also configure volume backups for `./.supabase-docker/volumes/db/data` on your host machine via CRON jobs or VPS snapshot systems like DigitalOcean Droplet Backups.
