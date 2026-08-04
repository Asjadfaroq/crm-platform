# Mini CRM — Deployment Guide

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment Variables](#2-environment-variables)
3. [Local Development](#3-local-development)
4. [Database Setup](#4-database-setup)
5. [Production Build](#5-production-build)
6. [Deployment Options](#6-deployment-options)
   - [Option A — Single VPS / Ubuntu Server (Nginx)](#option-a--single-vps--ubuntu-server-nginx)
   - [Option B — Railway](#option-b--railway)
   - [Option C — Render](#option-c--render)
   - [Option D — Vercel (Frontend) + Railway (Backend)](#option-d--vercel-frontend--railway-backend)
7. [Post-Deployment Checklist](#7-post-deployment-checklist)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| Node.js | 18.x | LTS recommended |
| npm | 9.x | Ships with Node 18 |
| SQL Server | 2019+ or Azure SQL | Azure SQL Basic tier is sufficient for production |
| SMTP account | — | Office365, Gmail, or SendGrid for email delivery |
| Git | any | For cloning the repo |

---

## 2. Environment Variables

### Server (`server/.env`)

Create `server/.env`. **Never commit this file.**

```env
# ─── Server ───────────────────────────────────────────────────────────────────
PORT=5003
NODE_ENV=production

# ─── Database (Prisma / SQL Server) ──────────────────────────────────────────
# Local SQL Server Express example:
# DATABASE_URL=sqlserver://localhost:1433;database=minicrm;user=sa;password=pass;instanceName=SQLEXPRESS;trustServerCertificate=true;encrypt=false

# Azure SQL example:
DATABASE_URL=sqlserver://<server>.database.windows.net:1433;database=<dbname>;user=<user>@<server>;password=<pass>;encrypt=true;trustServerCertificate=false

# ─── JWT ──────────────────────────────────────────────────────────────────────
JWT_SECRET=replace_with_a_long_random_string_at_least_32_chars
JWT_REFRESH_SECRET=replace_with_another_long_random_string

# ─── Public API key ───────────────────────────────────────────────────────────
API_KEY=your_public_api_key

# ─── Frontend origin — used in password reset and OTP email links ─────────────
CLIENT_URL=https://your-frontend-domain.com

# ─── CORS — comma-separated list of allowed frontend origins ─────────────────
ALLOWED_ORIGINS=https://your-frontend-domain.com

# ─── SMTP (Office365 example) ─────────────────────────────────────────────────
SMTP_SERVICE=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_MAIL=yourmail@example.com
SMTP_PASSWORD=yourpassword
```

> Generate strong secrets with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

### Client (`client/.env`)

```env
# Backend API base URL
# Dev: leave empty — Vite proxy forwards /api to the dev server
# Prod: set to your backend origin
VITE_API_URL=https://your-backend-domain.com

# Backend URL for Socket.IO
# Dev: full URL of the local backend
# Prod: full URL of the production backend
VITE_WS_URL=https://your-backend-domain.com
```

> If `VITE_WS_URL` is not set, the Socket.IO client automatically falls back to `window.location.host`, which works when the frontend and backend share the same domain.

---

## 3. Local Development

```bash
# 1. Clone the repository
git clone <repo-url> democrm
cd democrm

# 2. Install dependencies
cd server && npm install
cd ../client && npm install

# 3. Configure environment
# Create server/.env and fill in your local SQL Server values

# 4. Push Prisma schema to your local database
cd server
npx prisma db push

# 5. Start the backend (port 5003)
npm run dev

# 6. In a new terminal — start the frontend (port 5173)
cd ../client
npm run dev
```

Open `http://localhost:5173`. API calls are proxied to `http://localhost:5003` via Vite.

---

## 4. Database Setup

### Local SQL Server

```bash
cd server

# Sync the Prisma schema with your local SQL Server
npx prisma db push

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

### Azure SQL (Production)

1. Create an **Azure SQL Database** in the Azure Portal (Basic tier is sufficient).
2. Under **Firewalls and virtual networks**, add your server's IP address.
3. Copy the **ADO.NET** connection string and convert it to the Prisma URL format:
   ```
   sqlserver://<server>.database.windows.net:1433;database=<db>;user=<user>@<server>;password=<pass>;encrypt=true
   ```
4. Set it as `DATABASE_URL` in `server/.env`.
5. Apply the schema:

   **Option A — direct push (dev / staging):**
   ```bash
   cd server
   npx prisma db push
   ```

   **Option B — generate SQL and apply manually (production):**
   ```bash
   npx prisma migrate diff \
     --from-empty \
     --to-schema-datamodel prisma/schema.prisma \
     --script > migration.sql
   ```
   Then run `migration.sql` in **Azure Portal → SQL Database → Query editor**.

> `prisma migrate dev` is not supported on Azure SQL (requires shadow database permissions). Use `db push` or the manual SQL approach above.

---

## 5. Production Build

### Build the React frontend

```bash
cd client
npm run build
# Output → client/dist/
```

### (Optional) Serve frontend from Express

Add this to `server/src/index.js` **after** all API routes:

```js
const path = require('path');
app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get('*', (_req, res) =>
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'))
);
```

When using this approach, leave `VITE_API_URL` empty in `client/.env` so the client hits the same origin as the server.

---

## 6. Deployment Options

---

### Option A — Single VPS / Ubuntu Server (Nginx)

Best for: full control, on-premises SQL Server, custom domains.

#### 1. Provision the server

- Ubuntu 22.04 VPS (DigitalOcean, Hetzner, Linode, etc.)
- Open ports: `22` (SSH), `80` (HTTP), `443` (HTTPS)

#### 2. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3. Clone and install

```bash
git clone <repo-url> /var/www/democrm
cd /var/www/democrm

cd server && npm install --omit=dev
cd ../client && npm install && npm run build
```

#### 4. Configure environment

```bash
nano /var/www/democrm/server/.env
# Paste and fill in your production values
```

#### 5. Push the Prisma schema

```bash
cd /var/www/democrm/server
npx prisma db push
```

#### 6. Run with PM2

```bash
sudo npm install -g pm2

cd /var/www/democrm/server
pm2 start src/index.js --name democrm-api

pm2 save
pm2 startup   # follow the printed command to enable on boot
```

#### 7. Nginx reverse proxy

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/democrm
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Serve React SPA
    root /var/www/democrm/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Express
    location /api {
        proxy_pass http://localhost:5003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy Socket.IO (WebSocket upgrade required)
    location /socket.io {
        proxy_pass http://localhost:5003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/democrm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 8. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

### Option B — Railway

Best for: fast setup, automatic deploys, no server management.

1. Push the repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Create **two services** from the same repo:
   - **Backend service**: root directory `server/`, start command `npm start`.
   - **Frontend service**: root directory `client/`, build command `npm run build`, publish directory `dist`.
4. Add all `server/.env` variables to the backend service's **Variables** tab.
5. Set `CLIENT_URL` and `ALLOWED_ORIGINS` to the Railway-assigned frontend URL.
6. Set `VITE_API_URL` and `VITE_WS_URL` to the Railway-assigned backend URL in the frontend service variables.
7. After first deploy, apply the schema via Railway's shell:
   ```bash
   npx prisma db push
   ```

Railway auto-assigns HTTPS domains for each service.

---

### Option C — Render

1. Push the repo to GitHub.
2. **Backend**: New **Web Service** → root `server/` → build command `npm install` → start command `npm start`.
3. **Frontend**: New **Static Site** → root `client/` → build command `npm run build` → publish directory `dist`.
4. Add environment variables under each service's **Environment** tab.
5. Render supports Socket.IO out of the box over HTTP/1.1.
6. After the first deploy, run `npx prisma db push` via the Render shell.

---

### Option D — Vercel (Frontend) + Railway (Backend)

Best for: globally distributed frontend CDN + managed backend.

#### Frontend on Vercel

1. Import the repo in Vercel → set **Root Directory** to `client`.
2. Framework preset: **Vite**.
3. Add environment variables:
   - `VITE_API_URL=https://<your-railway-backend>.railway.app`
   - `VITE_WS_URL=https://<your-railway-backend>.railway.app`
4. Deploy.

#### Backend on Railway

Follow Option B backend steps. Set `CLIENT_URL` and `ALLOWED_ORIGINS` to your Vercel deployment URL (exact origin, no trailing slash).

---

## 7. Post-Deployment Checklist

- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` are strong unique secrets (not the defaults)
- [ ] `CLIENT_URL` and `ALLOWED_ORIGINS` match the exact deployed frontend origin (no trailing slash)
- [ ] `DATABASE_URL` points to the production SQL Server / Azure SQL with correct credentials
- [ ] Prisma schema has been applied to the production database (`db push` or manual SQL)
- [ ] `NODE_ENV=production` is set on the server
- [ ] SMTP credentials are valid — test by triggering a **Forgot Password** email
- [ ] Password reset email link points to the production frontend (not localhost)
- [ ] Ownership transfer OTP email is received successfully
- [ ] HTTPS is enabled on both frontend and backend
- [ ] Health check responds: `GET /api/health` → `{ status: 'ok' }`
- [ ] Socket.IO real-time updates are working in the dashboard
- [ ] Rate limiting is active on `/api/public/leads` (10 req/min per IP)
- [ ] Compliance logs are preserved after lead deletion — verify in the **Logs** page
- [ ] Azure SQL firewall allows connections from your production server IP

---

## 8. Troubleshooting

### CORS errors in the browser

`ALLOWED_ORIGINS` in `server/.env` must exactly match the frontend origin (protocol + domain + port, no trailing slash). Restart the server after any `.env` change.

### Password reset / OTP email links point to localhost

`CLIENT_URL` in `server/.env` must be set to the production frontend URL. Both forgot-password reset links and ownership transfer OTP emails use this value to build the link.

### Socket.IO fails to connect

- Confirm `/socket.io` is proxied correctly in Nginx (WebSocket upgrade headers must be set).
- `VITE_WS_URL` in `client/.env` must point to the backend server.
- If `VITE_WS_URL` is not set, the client falls back to `window.location.host` — this works when the frontend and backend share the same domain.

### Prisma: `prisma migrate dev` fails on Azure SQL

Azure SQL does not allow creating a shadow database. Use `npx prisma db push` for dev/staging, or generate SQL with `prisma migrate diff` and apply it manually for production.

### Prisma: Foreign key constraint on lead delete

`leadService.js` handles this by deleting `LeadNote` records first and setting `ActivityLog.leadId = null` to preserve compliance logs. Ensure you are running the latest version of `leadService.js`.

### Prisma: Unique constraint on lead create

The `leadId` generator uses the MAX of existing IDs, not COUNT, so deleting leads never causes duplicate `LD####` collisions. Ensure you are running the latest `generateLeadId` function in `leadService.js`.

### `npm run build` fails on client

```bash
cd client
rm -rf node_modules
npm install
npm run build
```

### PM2 process crashes on startup

```bash
pm2 logs democrm-api
```

Check the log output for missing environment variables or port conflicts.

### Port 5003 already in use

```bash
# Linux / macOS
lsof -ti:5003 | xargs kill -9

# Windows
netstat -ano | findstr :5003
taskkill /PID <pid> /F
```

---

*Mini CRM — Node.js + Express + Prisma + Azure SQL Server + React + Vite + Socket.IO*
