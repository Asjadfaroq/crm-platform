# Mini CRM — Deployment Guide

The app is two deployable pieces plus a database:

| Piece | Directory | What it is |
|---|---|---|
| API | `server/` | Express + Prisma + Socket.IO, needs a long-running Node process |
| Web | `client/` | Vite build, static files |
| Database | — | PostgreSQL 14+ |

Anything that runs Node and speaks PostgreSQL will host this. The walkthrough below
uses Neon, Render, and Vercel because all three have a usable free tier, but nothing
in the code is tied to them.

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Environment variables](#2-environment-variables)
3. [Local development](#3-local-development)
4. [Database setup](#4-database-setup)
5. [Deploying](#5-deploying)
6. [Post-deployment checklist](#6-post-deployment-checklist)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum | Notes |
|---|---|---|
| Node.js | 18.x | 20.x LTS recommended |
| npm | 9.x | Ships with Node 18 |
| PostgreSQL | 14 | Local, Docker, or hosted |
| Email provider | — | Brevo, Postmark, SendGrid, or any SMTP host |

Email is not optional. Every login sends a one-time code, so an account that cannot
send mail is an account that cannot sign in.

---

## 2. Environment variables

### `server/.env`

```env
PORT=5003

# ─── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require

# ─── JWT — generate each with: openssl rand -hex 32 ───────────────────────────
JWT_SECRET=
JWT_REFRESH_SECRET=

# ─── Public API key (sent in the x-api-key header) ────────────────────────────
API_KEY=

# ─── Frontend origin — used in email links and CORS ───────────────────────────
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# ─── Email ────────────────────────────────────────────────────────────────────
SMTP_SERVICE=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_MAIL=your_smtp_login
SMTP_PASSWORD=your_smtp_key
SMTP_FROM=you@example.com          # must be a verified sender

# Set only on hosts that block outbound SMTP — see §7. Delivers over HTTPS instead.
BREVO_API_KEY=

# ─── Optional branding ────────────────────────────────────────────────────────
APP_NAME=Mini CRM
SUPPORT_EMAIL=
```

`SMTP_MAIL` is the login; `SMTP_FROM` is the address recipients see. Most providers
reject mail sent from an unverified `From`, so these are usually different values.

### `client/.env`

```env
VITE_API_URL=              # empty in dev — the Vite proxy forwards /api
VITE_WS_URL=http://localhost:5003
```

In production set both to the deployed API origin.

> Vite inlines `VITE_*` variables at **build** time, not run time. Changing one in a
> hosting dashboard does nothing until you rebuild.

---

## 3. Local development

```bash
# Terminal 1
cd server && npm install && npm run dev

# Terminal 2
cd client && npm install && npm run dev
```

API on `http://localhost:5003`, web on `http://localhost:5173`.

A local PostgreSQL via Docker, if you need one:

```bash
docker run -d --name crm-postgres \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16
```

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public
```

---

## 4. Database setup

```bash
cd server
npx prisma db push      # create tables from prisma/schema.prisma
npx prisma studio       # optional — browse the data
```

`db push` is fine for development and for standing up a fresh database. For a change
history you can review and roll back, use `npx prisma migrate dev` instead.

There is no seed script. Create the first account through the signup screen — the first
user to create a workspace becomes its owner.

---

## 5. Deploying

### Database — Neon

Create a project, copy the connection string into `DATABASE_URL`, then run
`npx prisma db push` once from your machine against it.

Any managed PostgreSQL works: Supabase, Railway, RDS, or your own server.

### API — Render

New **Web Service**, pointed at this repository.

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `npm install && npx prisma generate` |
| Start Command | `npm start` |

Add every variable from §2 **except** `PORT` — Render assigns that, and setting it
yourself will break port detection.

Put the database and the API in the same region. A cross-region hop adds ~60 ms to
every query.

### Web — Vercel

Import the same repository.

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Environment variables:

```
VITE_API_URL=https://your-api-host
VITE_WS_URL=https://your-api-host
```

[`client/vercel.json`](client/vercel.json) rewrites all paths to `index.html`. Without it
every route except `/` returns 404 on a hard load — see §7.

### Connect the two

Back in the API host, set both to the deployed web origin:

```
CLIENT_URL=https://your-web-host
ALLOWED_ORIGINS=https://your-web-host
```

`ALLOWED_ORIGINS` drives CORS and the Socket.IO handshake. `CLIENT_URL` builds the links
inside emails. Miss either and the app loads but nothing works.

---

## 6. Post-deployment checklist

- [ ] `GET /api/leads` returns `401` — the API is up and auth middleware is running
- [ ] Browser console shows no CORS errors on the login page
- [ ] Signup delivers a code, and the code signs you in
- [ ] The live badge in the bottom-right reads **Live**, not **Connecting** — Socket.IO is through
- [ ] Creating a lead in one browser appears in another without a refresh
- [ ] Loading a deep link such as `/analytics` directly returns the app, not a 404
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `API_KEY` are freshly generated, not copied from an example
- [ ] No `.env` file is committed — `git log --all --name-only | grep '\.env$'` returns nothing

---

## 7. Troubleshooting

**Login hangs, then fails with `Connection timeout`.**
The host blocks outbound SMTP. Render's free tier blocks ports 25, 465, and 587. Set
`BREVO_API_KEY` to deliver over HTTPS instead — [`emailService.js`](server/src/services/emailService.js)
picks the transport automatically and falls back to SMTP when the key is absent.

**Every route except `/` returns 404 after deploying the frontend.**
The host is looking for files that do not exist; client-side routes only exist in the
browser. `client/vercel.json` handles this on Vercel. On Netlify use a `_redirects` file
with `/* /index.html 200`; on Nginx use `try_files $uri /index.html`.

**CORS errors in the browser console.**
`ALLOWED_ORIGINS` must contain the exact frontend origin — scheme included, no trailing
slash. It accepts a comma-separated list.

**The live badge stays on `Connecting`.**
The Socket.IO handshake is failing. Either the JWT is stale (rotating `JWT_SECRET`
invalidates every issued token — clear `localStorage` and sign in again) or the origin is
missing from `ALLOWED_ORIGINS`.

**Emails send but land in spam.**
Authenticate your sending domain with the provider (SPF and DKIM). A single verified
sender on a free mailbox domain works for testing but will be filtered in bulk.

**First request after a quiet period takes ~50 seconds.**
Free tiers idle the instance. Not a bug. Upgrade the plan, or accept the cold start.

**`prisma generate` fails on the host.**
`prisma` is a devDependency. If the host installs production dependencies only, either
move it into `dependencies` or set `NPM_CONFIG_PRODUCTION=false`.

---

*Node.js · Express · Prisma · PostgreSQL · React · Vite · Socket.IO*
