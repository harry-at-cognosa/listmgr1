# EC2 Deployment Guide: listmgr + listldr

**Created:** 2026-03-01
**Target:** AWS EC2 t2.small, Ubuntu 24.04 LTS, us-west-2 (Oregon)
**Architecture:** Nginx (port 80) -> Express (port 3001) -> FastAPI (port 8000), PostgreSQL 17

---

## Architecture Overview

```
  Browser (http://<PUBLIC_IP>)
       |
       v
  +---------+        +------------------+        +------------------+
  |  Nginx  | -----> |  Express (3001)  | -----> | FastAPI (8000)   |
  | port 80 |  /api  |  listmgr backend |  proxy |  listldr API     |
  +---------+        +------------------+        +------------------+
       |                     |                          |
       |              +------v--------------------------v------+
       |              |         PostgreSQL 17 (5432)           |
       |              |         Database: listmgr1             |
       v              |         + PostGIS 3.x                  |
  React SPA           +---------------------------------------+
  (static files
   from dist/)
```

- **Nginx** serves the React production build and reverse-proxies `/api/*` to Express
- **Express** handles authentication, CRUD, and proxies template-loader requests to FastAPI
- **FastAPI** handles document parsing, template loading, section extraction
- **PostgreSQL** is the shared database for both applications

---

## Part 1: Create the EC2 Instance (AWS Console)

> **AMI Note:** Your AMI `ami-03aa99ddf5498ceb9` was registered in a specific region.
> In the **us-west-2** console, search for the same name:
> `ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-20250821`
> If it doesn't appear, search "Ubuntu 24.04" in the AMI catalog and pick the latest
> **Ubuntu Noble 24.04 LTS amd64 hvm-ssd-gp3** image from Canonical (owner: `099720109477`).

### Step-by-step

1. **Navigate:** EC2 -> Launch Instances
2. **Name:** `listmgr-dev`
3. **AMI:**
   - Click "Browse more AMIs" -> search: `ubuntu-noble-24.04-amd64-server`
   - Select the latest Ubuntu 24.04 LTS (Noble) HVM SSD GP3 image from Canonical
   - Architecture: 64-bit (x86)
4. **Instance type:** `t2.small` (2 GiB RAM, 1 vCPU)
5. **Key pair:** Select existing -> `ctc01instance` (ID: `key-089afa492be0ae475`)
6. **Network settings:** Click "Edit"
   - **VPC:** Default VPC
   - **Subnet:** Any default subnet (or "No preference")
   - **Auto-assign public IP:** Enable
   - **Create security group** (new):
     - Name: `listmgr-dev-sg`
     - Description: `SSH + HTTP for listmgr dev instance`
     - **Rule 1:** SSH (port 22) -- Source: My IP (or your office CIDR)
     - **Rule 2:** HTTP (port 80) -- Source: `0.0.0.0/0` (or restrict to your IP)
     - No HTTPS rule needed for now (add later if you set up SSL)
7. **Configure storage:**
   - Root volume: **32 GiB**, gp3, not encrypted (default)
   - Delete on termination: Yes
8. **Advanced details:**
   - **IMDSv2:** Optional
   - **Termination protection:** Disabled
   - **Monitoring (CloudWatch detailed):** Disabled
   - Leave everything else at defaults
9. **Launch instance**

After launch, note the **Public IPv4 address** from the instance details page.

---

## Part 2: SSH In and Initial System Setup

```bash
# From your local machine (adjust .pem path as needed):
ssh -i ~/.ssh/ctc01instance.pem ubuntu@<PUBLIC_IP>
```

### 2a. System updates

```bash
sudo apt update && sudo apt upgrade -y
```

### 2b. Install core tools

```bash
sudo apt install -y git curl wget unzip build-essential software-properties-common
```

---

## Part 3: Install Node.js 20 LTS

```bash
# Add NodeSource repo for Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # Should show v20.x
npm --version    # Should show 10.x
```

> Node.js 18+ is required per the listmgr README. Node 20 LTS is the current long-term support version.

---

## Part 4: Install Python 3.12

Ubuntu 24.04 ships with Python 3.12 pre-installed. Verify and install supporting packages:

```bash
python3 --version   # Should show 3.12.x

# Install pip, venv, and dev headers (needed for psycopg2 compilation)
sudo apt install -y python3-pip python3-venv python3-dev libpq-dev
```

---

## Part 5: Install PostgreSQL 17 + PostGIS

### 5a. Install packages

```bash
# Add PostgreSQL official APT repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
sudo apt update

# Install PostgreSQL 17, contrib (extra utilities), client tools, and PostGIS
sudo apt install -y postgresql-17 postgresql-contrib-17 postgresql-client-17 postgresql-17-postgis-3

# Verify all tools are available
psql --version         # psql (PostgreSQL) 17.x
pg_restore --version   # pg_restore (PostgreSQL) 17.x
pg_dump --version      # pg_dump (PostgreSQL) 17.x
```

> This installs **all** PostgreSQL client utilities: `psql`, `pg_dump`, `pg_restore`,
> `pg_basebackup`, `createdb`, `dropdb`, `pg_isready`, etc.

### 5b. Configure PostgreSQL

```bash
# Start and enable PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Set a password for the 'postgres' superuser
# >>> Replace <YOUR_DB_PASSWORD> with your chosen password <<<
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '<YOUR_DB_PASSWORD>';"

# Create the application database
sudo -u postgres createdb listmgr1

# Enable PostGIS extension
sudo -u postgres psql -d listmgr1 -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Verify PostGIS
sudo -u postgres psql -d listmgr1 -c "SELECT PostGIS_Version();"
```

### 5c. Restore database from dump

Upload your dump file from your local machine, then restore it:

```bash
# --- Run this on your LOCAL machine ---
scp -i ~/.ssh/ctc01instance.pem /path/to/your/dumpfile.dump ubuntu@<PUBLIC_IP>:~/

# --- Then on the EC2 instance ---
# For a custom-format dump (.dump):
sudo -u postgres pg_restore -d listmgr1 -v ~/dumpfile.dump

# For a plain SQL dump (.sql):
# sudo -u postgres psql -d listmgr1 < ~/dumpfile.sql
```

### 5d. Configure PostgreSQL authentication (optional)

If you want password-based auth for local connections (to match .env config):

```bash
sudo nano /etc/postgresql/17/main/pg_hba.conf
```

Change:
```
local   all   all   peer
```
to:
```
local   all   all   md5
```

Then restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## Part 6: Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Quick verify -- should show default nginx welcome page HTML
curl -s http://localhost | head -5
```

---

## Part 7: Clone and Set Up Applications

### 7a. Set up GitHub access

Have your GitHub **Personal Access Token (PAT)** ready before this step.

```bash
# Configure git credential caching (stores PAT in memory for 12 hours)
git config --global credential.helper 'cache --timeout=43200'

# Clone both repos
# You will be prompted for username + PAT on the first clone
cd ~
git clone https://github.com/harry-at-cognosa/listmgr1.git 1_listmgr
git clone https://github.com/harry-at-cognosa/listldr1.git 1_listldr
```

> When prompted: **username** = your GitHub username, **password** = your Personal Access Token (NOT your GitHub password).

### 7b. Set up listmgr (Node.js app)

#### Install backend dependencies

```bash
cd ~/1_listmgr/backend
npm install
```

#### Create backend .env file

```bash
nano ~/1_listmgr/backend/.env
```

Paste the following (replace placeholders):

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=listmgr1
DB_USER=postgres
DB_PASSWORD=<YOUR_DB_PASSWORD>

# Server Configuration
PORT=3001
SESSION_SECRET=<PASTE_A_RANDOM_HEX_STRING_HERE>
NODE_ENV=production

# Template Loader Service (Python FastAPI)
TEMPLATE_LOADER_URL=http://127.0.0.1:8000
```

Generate the session secret:
```bash
# Run this and paste the output as your SESSION_SECRET value
openssl rand -hex 32
```

#### Build the React frontend

```bash
cd ~/1_listmgr/frontend
npm install
npm run build
# Creates the dist/ directory with the production build
```

### 7c. Set up listldr (Python/FastAPI app)

```bash
cd ~/1_listldr

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

deactivate
```

#### Create listldr .env file

```bash
nano ~/1_listldr/.env
```

Paste the following (replace placeholder):

```env
# Database connection
LISTLDR_DB_HOST=localhost
LISTLDR_DB_PORT=5432
LISTLDR_DB_USER=postgres
LISTLDR_DB_PASSWORD=<YOUR_DB_PASSWORD>
LISTLDR_DB_NAME=listmgr1

# CORS origins (Express backend calls FastAPI server-to-server,
# so CORS doesn't technically apply, but kept for correctness)
LISTLDR_CORS_ORIGINS=http://localhost:3001
```

#### Update batch config paths (if using batch scripts)

```bash
nano ~/1_listldr/conf/listldr_sqt.ini
```

Change `PATH_ROOT` from the Mac path to the EC2 path:
```ini
[paths]
PATH_ROOT = /home/ubuntu/1_listldr_files
```

---

## Part 8: Configure Nginx as Reverse Proxy

### Create the site configuration

```bash
sudo nano /etc/nginx/sites-available/listmgr
```

Paste this configuration:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Serve the React production build
    root /home/ubuntu/1_listmgr/frontend/dist;
    index index.html;

    # API requests -> Express backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Needed for file uploads (template loading)
        client_max_body_size 50M;

        # Timeout for long-running requests (template processing)
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # React SPA -- serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Enable the site

```bash
# Remove default nginx site, enable listmgr
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/listmgr /etc/nginx/sites-enabled/listmgr

# Test the configuration for syntax errors
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## Part 9: Update Express CORS for Production

Since nginx serves both the React static files and proxies API calls on the **same origin** (`http://<PUBLIC_IP>`), the browser won't see a cross-origin situation. CORS headers shouldn't be needed. However, for safety, update the CORS origin list in Express:

```bash
nano ~/1_listmgr/backend/index.js
```

Find the `origin` array in the CORS configuration and add your public IP:

```javascript
origin: [
  'http://localhost:5173',    // local dev (keep for convenience)
  'http://<PUBLIC_IP>',       // EC2 public access
],
```

Also ensure the session cookie has `sameSite: 'lax'`:

```javascript
cookie: {
  secure: false,        // Keep false until you add HTTPS
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: 'lax'
}
```

> **Note:** If you later assign an Elastic IP or domain, update the CORS origin to match.

---

## Part 10: Create systemd Services

Using systemd ensures both services start on boot and auto-restart on failure.

### 10a. Express backend service

```bash
sudo nano /etc/systemd/system/listmgr.service
```

```ini
[Unit]
Description=ListMgr Express Backend
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/1_listmgr/backend
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 10b. FastAPI service

```bash
sudo nano /etc/systemd/system/listldr.service
```

```ini
[Unit]
Description=ListLdr FastAPI Service
After=network.target postgresql.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/1_listldr
ExecStart=/home/ubuntu/1_listldr/venv/bin/uvicorn api.app:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### 10c. Enable and start both services

```bash
sudo systemctl daemon-reload
sudo systemctl enable listmgr listldr
sudo systemctl start listmgr listldr

# Check status of each
sudo systemctl status listmgr
sudo systemctl status listldr
```

### Useful service commands

```bash
# View logs
sudo journalctl -u listmgr -f          # Follow Express logs
sudo journalctl -u listldr -f          # Follow FastAPI logs
sudo journalctl -u listmgr --since "1 hour ago"

# Restart after code changes
sudo systemctl restart listmgr
sudo systemctl restart listldr

# Stop a service
sudo systemctl stop listmgr
```

---

## Part 11: Verify the Deployment

Run these checks on the EC2 instance:

```bash
# 1. PostgreSQL running?
sudo systemctl status postgresql

# 2. Express backend responding?
curl -s http://localhost:3001/api/health
# Expected: JSON health check response

# 3. FastAPI responding?
curl -s http://localhost:8000/docs | head -5
# Expected: FastAPI Swagger UI HTML

# 4. Nginx proxying correctly?
curl -s http://localhost/api/health
# Expected: Same response as #2

# 5. Static files served?
curl -s http://localhost/ | head -5
# Expected: React app HTML
```

Then from your **local browser**, navigate to:
```
http://<PUBLIC_IP>/
```

You should see the ListMgr login page. Default credentials: `admin` / `admin`

---

## Part 12: SSH Access for Batch Jobs

```bash
# SSH into the instance
ssh -i ~/.ssh/ctc01instance.pem ubuntu@<PUBLIC_IP>

# Activate the Python virtual environment
cd ~/1_listldr
source venv/bin/activate

# Run the batch template loader
python -m cli.batch_load --ini ./conf/listldr_sqt.ini

# Run the blob archive tool (dry run)
python cli/archive_blobs.py 260101 --dry-run

# When done
deactivate
```

> Remember to upload your input files to the EC2 instance first
> (to the path configured in `listldr_sqt.ini` under `PATH_ROOT`).

---

## Quick Reference

### Installed Software

| Software   | Version              | Purpose                          |
|------------|----------------------|----------------------------------|
| Ubuntu     | 24.04 LTS (Noble)    | Operating system                 |
| Node.js    | 20 LTS               | Express backend + React build    |
| npm        | 10.x                 | Package management               |
| Python     | 3.12.x (pre-installed)| FastAPI + batch scripts          |
| PostgreSQL | 17.x                 | Database                         |
| PostGIS    | 3.x                  | Geospatial extension             |
| Nginx      | latest               | Reverse proxy + static files     |
| Git        | latest               | Repository cloning               |

### Ports

| Port | Service         | Accessible From    |
|------|-----------------|--------------------|
| 22   | SSH             | Your IP only       |
| 80   | Nginx (HTTP)    | Public             |
| 3001 | Express         | localhost only     |
| 8000 | FastAPI/Uvicorn | localhost only     |
| 5432 | PostgreSQL      | localhost only     |

### Key Configuration Files

| File                              | Purpose                            |
|-----------------------------------|------------------------------------|
| `~/1_listmgr/backend/.env`       | DB password, session secret, port  |
| `~/1_listldr/.env`               | DB password, CORS origins          |
| `~/1_listldr/conf/listldr_sqt.ini` | Batch loader paths and settings  |
| `/etc/nginx/sites-available/listmgr` | Nginx reverse proxy config     |
| `/etc/systemd/system/listmgr.service` | Express systemd service       |
| `/etc/systemd/system/listldr.service` | FastAPI systemd service        |

### Placeholders to Replace

Search for these and replace with your actual values:

| Placeholder           | Where Used                          | Example Value              |
|-----------------------|-------------------------------------|----------------------------|
| `<PUBLIC_IP>`         | SSH commands, CORS, browser URL     | `34.215.xxx.xxx`          |
| `<YOUR_DB_PASSWORD>`  | All .env files, PostgreSQL setup    | A strong password          |

---

## Verification Checklist

- [ ] EC2 instance running with public IP
- [ ] Can SSH in with `ctc01instance` key
- [ ] PostgreSQL 17 running, `listmgr1` database restored
- [ ] PostGIS extension enabled
- [ ] Node.js 20 installed, `npm` available
- [ ] Python 3.12 with venv and pip
- [ ] listmgr cloned, backend + frontend dependencies installed, frontend built
- [ ] listldr cloned, venv created, Python dependencies installed
- [ ] `.env` files created with correct DB credentials
- [ ] Nginx configured and serving the React frontend on port 80
- [ ] Express backend running (systemd) on port 3001
- [ ] FastAPI running (systemd) on port 8000
- [ ] `/api/health` reachable via nginx on port 80
- [ ] Login page accessible from browser at `http://<PUBLIC_IP>/`
- [ ] Can SSH in and run batch scripts with Python venv
