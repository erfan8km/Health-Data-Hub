# IEDR — Production Deployment Guide

**Deploying the Iran Epidemiology Data Repository on a Linux VPS**

This guide covers deploying IEDR on any Linux VPS (Ubuntu 22.04+ / Debian 12+) without Replit-specific services. The stack is fully portable.

---

## Prerequisites

- A Linux VPS with at least 1 vCPU and 1 GB RAM
- A domain name pointed at the server (optional, but recommended)
- SSH access with `sudo` privileges
- Ports 80 and 443 open in firewall

---

## 1. Install system dependencies

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 24 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Install nginx (reverse proxy)
sudo apt install -y nginx

# (Optional) Install certbot for HTTPS
sudo apt install -y certbot python3-certbot-nginx
```

---

## 2. Set up PostgreSQL

```bash
# Switch to postgres user and create the DB + role
sudo -u postgres psql <<'SQL'
CREATE USER iedr WITH PASSWORD 'your_strong_password_here';
CREATE DATABASE iedr OWNER iedr;
GRANT ALL PRIVILEGES ON DATABASE iedr TO iedr;
SQL
```

Test the connection:

```bash
psql postgresql://iedr:your_strong_password_here@localhost:5432/iedr -c '\l'
```

---

## 3. Create a dedicated system user

```bash
sudo useradd --system --create-home --shell /bin/bash iedr
sudo su - iedr
```

All subsequent steps run as the `iedr` user unless noted.

---

## 4. Clone the repository

```bash
git clone https://github.com/your-org/iedr.git /home/iedr/app
cd /home/iedr/app
```

---

## 5. Install dependencies

```bash
pnpm install --frozen-lockfile
```

---

## 6. Configure environment variables

Create the environment file for the API server:

```bash
cat > /home/iedr/app/artifacts/api-server/.env.production <<'ENV'
DATABASE_URL=postgresql://iedr:your_strong_password_here@localhost:5432/iedr
PORT=8080
NODE_ENV=production
ADMIN_PASSWORD=choose_a_strong_admin_password
SESSION_SECRET=choose_a_long_random_secret_string
ENV
```

> **Security**: `chmod 600 /home/iedr/app/artifacts/api-server/.env.production`

---

## 7. Run database migrations

Push the Drizzle schema to the database:

```bash
cd /home/iedr/app
DATABASE_URL=postgresql://iedr:your_strong_password_here@localhost:5432/iedr \
  pnpm --filter @workspace/db run push
```

---

## 8. Build the API server

```bash
cd /home/iedr/app
pnpm --filter @workspace/api-server run build
```

This produces `artifacts/api-server/dist/index.mjs`.

---

## 9. Build the frontend

```bash
cd /home/iedr/app
pnpm --filter @workspace/iedr run build
```

This produces static files in `artifacts/iedr/dist/`.

---

## 10. Set up systemd service for the API server

Exit back to your sudo user, then:

```bash
sudo tee /etc/systemd/system/iedr-api.service <<'SERVICE'
[Unit]
Description=IEDR API Server
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=iedr
WorkingDirectory=/home/iedr/app/artifacts/api-server
EnvironmentFile=/home/iedr/app/artifacts/api-server/.env.production
ExecStart=/usr/bin/node --enable-source-maps ./dist/index.mjs
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=iedr-api

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable iedr-api
sudo systemctl start iedr-api
sudo systemctl status iedr-api
```

Verify it's running:

```bash
curl http://localhost:8080/api/healthz
# Expected: {"status":"ok"}
```

---

## 11. Configure nginx

Create the nginx site config:

```bash
sudo tee /etc/nginx/sites-available/iedr <<'NGINX'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # API — proxy to Express
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # Frontend — serve static files
    root /home/iedr/app/artifacts/iedr/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

sudo ln -s /etc/nginx/sites-available/iedr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 12. Enable HTTPS with Let's Encrypt (optional but recommended)

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Certbot automatically modifies the nginx config and sets up certificate renewal.

---

## 13. Securing the mutating API routes (recommended for production)

In v1, `POST`, `PUT`, and `DELETE` API routes are unprotected at the API layer. The admin password gate exists only in the browser UI. For production, add nginx IP restriction or an API key middleware.

**Option A — Restrict by IP in nginx** (simplest):

```nginx
location ~ ^/api/(categories|datasets|variables) {
    # Allow only admin IPs
    allow 1.2.3.4;   # your admin IP
    deny all;

    limit_except GET {
        allow 1.2.3.4;
        deny all;
    }

    proxy_pass http://127.0.0.1:8080;
    # ... other proxy headers
}
```

**Option B — Add a static API key middleware** in `artifacts/api-server/src/app.ts`:

```typescript
app.use((req, res, next) => {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutating.includes(req.method)) return next();
  const key = req.headers['x-admin-key'];
  if (key !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

---

## 14. Deploying updates

```bash
# Pull new code
cd /home/iedr/app
git pull origin main

# Install any new dependencies
pnpm install --frozen-lockfile

# Run schema migrations (if schema changed)
DATABASE_URL=... pnpm --filter @workspace/db run push

# Rebuild
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/iedr run build

# Restart API server
sudo systemctl restart iedr-api

# Reload nginx (if config changed)
sudo systemctl reload nginx
```

---

## 15. Backup and restore

### Manual database dump

```bash
pg_dump postgresql://iedr:password@localhost:5432/iedr > iedr-backup-$(date +%Y%m%d).sql
```

### Restore from dump

```bash
psql postgresql://iedr:password@localhost:5432/iedr < iedr-backup-20260101.sql
```

### Automated nightly backup with cron

```bash
crontab -e
# Add:
0 2 * * * pg_dump postgresql://iedr:password@localhost:5432/iedr | gzip > /home/iedr/backups/iedr-$(date +\%Y\%m\%d).sql.gz
```

---

## 16. Seeding initial data

If starting from a clean database, run the seed script (if available):

```bash
cd /home/iedr/app
DATABASE_URL=... node scripts/src/seed.js
```

Or use the Admin panel Export tab to import a previously exported JSON backup.

---

## 17. Monitoring

View API server logs:

```bash
sudo journalctl -u iedr-api -f
```

View nginx access logs:

```bash
sudo tail -f /var/log/nginx/access.log
```

Check service status:

```bash
sudo systemctl status iedr-api nginx postgresql
```

---

## Environment variable reference

| Variable | Required | Example |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://iedr:pass@localhost:5432/iedr` |
| `PORT` | Yes | `8080` |
| `NODE_ENV` | Yes | `production` |
| `ADMIN_PASSWORD` | Yes | A strong password (≥16 chars) |
| `SESSION_SECRET` | Recommended | A random 64-char hex string |

Generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| API returns 502 | API server not running | `systemctl restart iedr-api` and check logs |
| Frontend loads but API fails | BASE_URL mismatch | Ensure nginx proxies `/api/` to port 8080 |
| Persian text garbled in CSV | BOM stripped | Verify Excel imports with UTF-8 BOM setting |
| DB connection refused | PostgreSQL not running | `systemctl start postgresql` |
| `PORT` env missing | EnvironmentFile not loaded | Check `.env.production` path in systemd unit |
