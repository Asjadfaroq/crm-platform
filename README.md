<div align="center">

# Mini CRM

**Multi-workspace CRM for lead and sales-pipeline management — workspace-scoped RBAC, real-time updates, compliance activity logging, email OTP authentication, and a public lead-submission API.**

[![Live App](https://img.shields.io/badge/Live_App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=fff)](https://crm-platform-delta-ten.vercel.app)
[![API](https://img.shields.io/badge/API-Node.js_%2B_Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=fff)](./server)
[![Frontend](https://img.shields.io/badge/Frontend-React_%2B_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=000)](./client)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=fff)](./server/prisma/schema.prisma)

</div>

---

## Overview

Mini CRM is a multi-tenant CRM built for small sales teams. Each user can belong to multiple **workspaces**, and each workspace has its own isolated set of leads, members, and compliance activity logs. Leads can be submitted externally via an API key, tracked through a full pipeline, assigned to team members, and commented on — all with a live-updating dashboard and an admin-only analytics view.

**Stack:** Node.js, Express, Prisma, PostgreSQL, Socket.IO, JWT, Zod, React 18, Vite, Redux Toolkit, React Router v7.

---

## Table of Contents

- [Feature Overview](#feature-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
  - [Database Setup](#database-setup)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Role System](#role-system)
- [Real-Time Events (Socket.IO)](#real-time-events-socketio)
- [Frontend Architecture](#frontend-architecture)
- [Scripts](#scripts)

---

## Feature Overview

### 1) Authentication & Sessions
- JWT authentication with access and refresh tokens.
- Two-step login: password, then a 6-digit OTP delivered by email.
- Single active session per user — a new login evicts the previous device over WebSocket.
- Forgot / reset password via time-limited emailed token.
- Passwords hashed with bcrypt.

### 2) Multi-Workspace Tenancy
- A user can own or belong to any number of workspaces.
- Leads, members, and activity logs are fully isolated per workspace.
- Auto-generated unique slug and 48-character API key per workspace.
- Workspace switching without re-login.
- Ownership transfer confirmed by an OTP sent to the current owner.

### 3) Lead Lifecycle
- Sequential per-workspace IDs in `LD0001` format, derived from `MAX()` so deletions never produce duplicates.
- Status: `New → Contacted → In Progress → Closed / Rejected`.
- Priority: `Low`, `Medium`, `High`, `Urgent`.
- Assignment, follow-up scheduling, DIP account state, and mobile-verification state.
- Soft delete with restore — removed leads move to `deleted_leads` and their ID stays reserved.

### 4) Role-Based Access Control
- Four workspace roles: `owner`, `admin`, `editor`, `viewer`.
- Enforced server-side by `workspaceGuard` (membership + role injection) and `roleGuard`.
- The frontend hides what a role cannot do, but authorization is decided at the API layer.
- Full matrix in [Role System](#role-system).

### 5) Compliance Activity Logging
- Every mutation is recorded with actor, field-level old and new values, and IP address.
- Logs are never deleted. When a lead is removed its `leadId` becomes `null` and `leadRef` retains the human-readable ID, so the audit trail survives.
- Filterable by date range, action type, user, and lead.

### 6) Real-Time Updates
- Socket.IO rooms scoped per workspace, authenticated by JWT during the handshake.
- Lead create / update / delete broadcast to every connected member.
- Invitations, ownership transfers, and forced logouts delivered live.

### 7) Public Lead Submission API
- External sites can POST leads with no user session.
- Authenticated by workspace API key.
- Rate limited to 10 requests per minute per IP.

### 8) Analytics
- Admin-only dashboard: status donut, priority bars, verification and DIP splits, six-month trend line, and a top-performer leaderboard.
- Aggregations run in SQL, not in application memory.

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | HTTP server and REST API |
| Prisma ORM | Database access layer |
| PostgreSQL | Relational database |
| Socket.IO | Real-time WebSocket events |
| JSON Web Tokens (JWT) | Authentication |
| bcryptjs | Password hashing |
| Nodemailer / Brevo | OTP, password reset, and invitation emails |
| Zod | Request schema validation |
| Helmet | HTTP security headers |
| express-rate-limit | Rate limiting |

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Vite | Build tool and dev server |
| Redux Toolkit | Global state management |
| React Router v7 | Client-side routing |
| Axios | HTTP client |
| Socket.IO Client | Real-time event handling |
| react-hot-toast | Toast notifications |
| react-icons | Icon library |

---

## Project Structure

```text
crm-platform/
├── client/                          # React frontend
│   ├── .env.example                 # VITE_API_URL, VITE_WS_URL
│   ├── vercel.json                  # SPA rewrite — all paths serve index.html
│   └── src/
│       ├── api/
│       │   ├── axios.js             # Axios instance with JWT + workspace interceptors
│       │   └── socket.js            # Socket.IO singleton client
│       ├── components/
│       │   ├── KpiCards.jsx         # Dashboard stat cards
│       │   ├── Layout.jsx           # App shell with sidebar
│       │   ├── LeadDetailModal.jsx  # Lead detail view (Details / Notes / Activity tabs)
│       │   ├── LeadTable.jsx        # Paginated leads table with Notes & Mobile Verify popover
│       │   ├── LogViewer.jsx        # Activity log component
│       │   ├── ProtectedRoute.jsx   # Auth guard wrapper
│       │   ├── Sidebar.jsx          # Navigation sidebar (role-aware)
│       │   ├── SocketProvider.jsx   # WebSocket connection provider
│       │   └── ThemeToggle.jsx      # Dark/light mode switch
│       ├── pages/
│       │   ├── AnalyticsPage.jsx    # Admin analytics dashboard with charts
│       │   ├── ApiWebhookPage.jsx   # API key & webhook config
│       │   ├── DashboardPage.jsx    # Main lead management view
│       │   ├── ForgotPasswordPage.jsx
│       │   ├── LoginPage.jsx
│       │   ├── LogsPage.jsx         # Activity audit logs (survive lead deletion)
│       │   ├── OtpPage.jsx          # Second login step
│       │   ├── ProfilePage.jsx
│       │   ├── ResetPasswordPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── WorkspacesPage.jsx   # Workspace switcher
│       │   ├── CreateWorkspacePage.jsx
│       │   ├── UsersPage.jsx        # Member management with role badges
│       │   └── WorkspaceSettingsPage.jsx  # Includes ownership transfer via OTP
│       └── store/
│           ├── index.js             # Redux store
│           └── slices/
│               ├── authSlice.js
│               ├── leadSlice.js     # Leads, KPI stats, analytics, socket handlers
│               ├── deletedLeadSlice.js
│               ├── logSlice.js
│               ├── userSlice.js
│               └── workspaceSlice.js
│
└── server/                          # Express backend
    ├── .env.example
    ├── prisma/
    │   └── schema.prisma            # Prisma schema (PostgreSQL)
    └── src/
        ├── index.js                 # App entry point, Socket.IO setup, CORS config
        ├── config/
        │   └── db.js                # Prisma client singleton
        ├── controllers/
        │   ├── authController.js    # login, signup, OTP, forgot/reset password
        │   ├── leadController.js    # CRUD + analytics
        │   ├── logController.js
        │   ├── userController.js
        │   └── workspaceController.js  # Members, roles, invite, ownership transfer
        ├── routes/
        │   ├── authRoutes.js
        │   ├── leadRoutes.js
        │   ├── logRoutes.js
        │   ├── userRoutes.js
        │   ├── workspaceRoutes.js
        │   └── publicRoutes.js
        ├── middleware/
        │   ├── auth.js              # JWT verification
        │   ├── workspaceGuard.js    # Workspace membership + role injection
        │   ├── roleGuard.js         # Role-based access control
        │   ├── validate.js          # Zod request validation
        │   ├── rateLimiter.js       # Rate limiting rules
        │   └── errorHandler.js      # Global error handler
        ├── services/
        │   ├── emailService.js      # Transactional email templates + delivery
        │   ├── leadService.js       # Lead business logic + analytics aggregation
        │   └── logService.js        # Activity log business logic
        └── validators/
            ├── authValidator.js
            └── leadValidator.js
```

---

## Features

### Authentication & Sessions
- JWT-based login with configurable expiry + refresh token support
- Email OTP as the second login step — a 6-digit code valid for 10 minutes
- **Session conflict detection** — logging in from a new device notifies and evicts the old session via WebSocket
- **Forgot password** — sends a time-limited reset link to the user's email
- **Reset password** — token-validated password reset via email link
- bcrypt password hashing

### Multi-Workspace Support
- Users can own or be members of multiple workspaces
- Each workspace is fully isolated (leads, logs, members)
- Auto-generated unique slugs and cryptographic API keys per workspace
- Workspace switching in the dashboard without re-login
- **Ownership transfer via email OTP** — owner initiates transfer, confirms with a 6-digit OTP sent to their email; new owner gains full ownership immediately

### Lead Management
- Per-workspace sequential lead IDs (`LD0001` format) — generation uses MAX of existing IDs so deletions never cause duplicates
- Lead pipeline statuses: `New`, `Contacted`, `In Progress`, `Closed`, `Rejected`
- Priority levels: `Low`, `Medium`, `High`, `Urgent`
- Assign leads to team members
- Schedule follow-up dates
- DIP account status tracking (`pending` / `created`)
- Add timestamped notes/comments to any lead via floating popover panel
- Mobile verification status per lead (`verifiedMobile` toggle)
- Full-text search across name, mobile, and lead ID
- Filter by status, priority, assigned user
- Paginated results with configurable page size
- Soft delete with restore — deleted leads keep their reserved ID

### Notes & Mobile Verification Popover
- Clicking the notes icon in any table row opens a floating panel
- **Notes tab** — view and add notes in-line without leaving the table
- **Mobile Verification tab** — see the lead's mobile number, current verification status, and toggle verified/unverified (admins and editors)

### Analytics Dashboard (Admin only)
- Accessible via the **Analytics** sidebar link
- KPI summary row, status donut chart, priority bar chart, mobile verification split, DIP split, monthly trend line, top team members leaderboard
- Refresh button to re-fetch live data

### Compliance Activity Logging
- Every action (create, update, assign, delete, note added, mobile verified) is logged
- **Logs are never deleted** — when a lead is removed, its `leadId` in the log is set to `null` so the audit trail is permanently preserved
- "Lead Deleted" log entry records which user deleted the lead and the lead's identifying info
- Field-level change tracking with old and new values
- IP address recorded per action
- Filterable by date range, action type, user, and lead

### Real-Time Updates
- WebSocket events broadcast instantly to all workspace members
- Live lead creation, updates, and deletion reflected on all connected dashboards
- Invite notifications and ownership transfer events delivered in real time

### Public Lead Submission API
- External websites and backends can POST leads without a user login
- Authenticated via API key (header or Bearer token)
- Rate limited to 10 requests per minute per IP

### Role-Based Access Control
- Four roles per workspace: `owner`, `admin`, `editor`, `viewer`
- See [Role System](#role-system) for the full permission matrix

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (local, Docker, or a hosted provider such as Neon)
- A transactional email account (Brevo, Postmark, SendGrid, or any SMTP host)

> Email is not optional. Every login sends a one-time code, so an account that cannot send mail is an account that cannot sign in.

### Environment Variables

**`server/.env`**

```env
PORT=5003

# Prisma / PostgreSQL
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require

# JWT — generate each with: openssl rand -hex 32
JWT_SECRET=replace_with_a_long_random_string
JWT_REFRESH_SECRET=replace_with_another_long_random_string

# Public API key (sent in x-api-key header)
API_KEY=your_public_api_key

# Frontend origin — used in email links and CORS
CLIENT_URL=http://localhost:5173

# CORS — comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# SMTP (Brevo example)
SMTP_SERVICE=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_MAIL=your_smtp_login
SMTP_PASSWORD=your_smtp_key

# Sender address shown to recipients. Must be verified with your provider.
SMTP_FROM=you@example.com

# Optional. Set on hosts that block outbound SMTP (e.g. Render's free tier) to
# deliver over HTTPS instead. When unset, the SMTP transport above is used.
BREVO_API_KEY=

# Optional branding
APP_NAME=Mini CRM
SUPPORT_EMAIL=
```

**`client/.env`**

```env
# Leave empty in dev — Vite proxy forwards /api to the dev server
VITE_API_URL=

# Backend URL for Socket.IO (dev: full localhost URL, prod: backend domain)
VITE_WS_URL=http://localhost:5003
```

> In production set `VITE_API_URL` and `VITE_WS_URL` to your deployed backend origin. Vite inlines these at **build** time — changing them in a hosting dashboard does nothing until you rebuild.

### Installation

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running the App

```bash
# Terminal 1 — Start backend
cd server
npm run dev

# Terminal 2 — Start frontend
cd client
npm run dev
```

The API runs at `http://localhost:5003` and the frontend at `http://localhost:5173`.

### Database Setup

```bash
cd server

# Push the Prisma schema to your database
npx prisma db push

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

> `db push` is the quickest way to get a schema in place. For a change history you can review and roll back, use `npx prisma migrate dev` instead — PostgreSQL supports the shadow database it needs.

There is no seed script. Create the first account through the signup screen — the first user to create a workspace becomes its owner.

---

## Deployment

The app is two deployable pieces plus a database. Anything that runs Node and speaks PostgreSQL will host it.

| Piece | Directory | Requirement |
|---|---|---|
| API | `server/` | Long-running Node process |
| Web | `client/` | Static file host |
| Database | — | PostgreSQL 14+ |

Full instructions, including the two failure modes worth knowing about — hosts that block outbound SMTP, and the SPA rewrite deep links need — are in **[DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)**.

---

## API Reference

All protected endpoints require:
- `Authorization: Bearer <token>` header
- `x-workspace-id: <workspaceId>` header (for workspace-scoped routes)

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Validate credentials, send OTP | Public |
| POST | `/api/auth/signup` | Self-register, send OTP | Public |
| POST | `/api/auth/verify-otp` | Exchange OTP for JWT | Public |
| POST | `/api/auth/resend-otp` | Reissue a verification code | Public |
| GET | `/api/auth/me` | Get current user + workspaces | Required |
| POST | `/api/auth/logout` | Invalidate session token | Required |
| POST | `/api/auth/forgot-password` | Send password reset email | Public |
| POST | `/api/auth/reset-password` | Reset password via token | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public (refresh token) |
| PATCH | `/api/auth/profile` | Update own profile | Required |
| PATCH | `/api/auth/change-password` | Change own password | Required |

---

### Leads

All routes require auth + workspace membership.

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/leads` | List leads (paginated, filterable) | All |
| GET | `/api/leads/stats` | Dashboard KPI stats | All |
| GET | `/api/leads/analytics` | Full analytics aggregation | Admin / Owner |
| GET | `/api/leads/deleted` | List soft-deleted leads | Admin / Owner |
| GET | `/api/leads/:id` | Get single lead | All |
| POST | `/api/leads` | Create lead | Admin / Owner |
| PUT | `/api/leads/:id` | Update lead | Admin / Owner / Editor (assigned) |
| DELETE | `/api/leads/:id` | Soft-delete lead | Admin / Owner |
| POST | `/api/leads/:id/restore` | Restore a deleted lead | Admin / Owner |
| PUT | `/api/leads/:id/assign` | Assign lead to user | Admin / Owner |
| POST | `/api/leads/:id/notes` | Add note to lead | Admin / Owner / Editor |

**Query params for `GET /api/leads`:**
```
page=1&limit=20&status=New&priority=High&assignedTo=<userId>&search=<text>
```

---

### Workspaces

| Method | Endpoint | Description | Role |
|---|---|---|---|
| POST | `/api/workspaces` | Create workspace | Authenticated |
| GET | `/api/workspaces` | List my workspaces | Authenticated |
| GET | `/api/workspaces/:id` | Get workspace details | Member |
| POST | `/api/workspaces/:id/invite` | Invite member by email | Admin / Owner |
| PATCH | `/api/workspaces/:id/members/:userId/role` | Change member role | Admin / Owner (see Role System) |
| GET | `/api/workspaces/:id/members/:userId/removal-preview` | Preview impact of removing a member | Admin / Owner |
| DELETE | `/api/workspaces/:id/members/:userId` | Remove member | Admin / Owner |
| PATCH | `/api/workspaces/:id/settings` | Update webhook / regenerate API key | Admin / Owner |
| POST | `/api/workspaces/:id/transfer-ownership/request` | Initiate ownership transfer (sends OTP) | Owner only |
| POST | `/api/workspaces/:id/transfer-ownership/confirm` | Confirm transfer with OTP | Owner only |

---

### Users

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/users` | List workspace members | All |
| PATCH | `/api/users/:id/toggle` | Activate / deactivate user | Admin / Owner |
| PATCH | `/api/users/:id/role` | Change workspace role | Admin / Owner |

---

### Logs

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/logs` | All workspace logs (paginated) | All |
| GET | `/api/logs/lead/:id` | Logs for a specific lead | All |

**Query params for `GET /api/logs`:**
```
page=1&limit=20&actionType=Status+Changed&userId=<id>&startDate=2024-01-01&endDate=2024-12-31
```

> Logs for deleted leads are retained with `leadId = null`. The `leadRef` and `oldValue` fields preserve the lead's ID, name, and mobile at the time of deletion.

---

### Public API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/public/leads` | Submit a lead (no user login needed) |
| PATCH | `/api/public/leads/:id/verify-mobile` | Mark lead's mobile as verified |

**Headers:**
```
x-api-key: <workspace_api_key>
x-workspace-id: <workspaceId>
Content-Type: application/json
```

Rate limit: 10 requests per minute per IP.

---

## Data Models

### User
```
name                String    required
email               String    required, unique
password            String    hashed with bcrypt
isActive            Boolean   default: true
activeSessionToken  String    tracks current login session
otp                 String?   6-digit login / signup code
otpExpiry           DateTime? code expiry
isEmailVerified     Boolean   default: false
resetToken          String?   password reset token
resetTokenExpiry    DateTime? reset token expiry
```

### Workspace
```
name               String     required
slug               String     unique, auto-generated
ownerId            Int        FK → User (the workspace owner)
members            WorkspaceMember[]
apiKey             String     48-char hex, auto-generated
webhookUrl         String?
transferOtp        String?    6-digit OTP for ownership transfer
transferOtpExpiry  DateTime?
transferToUserId   Int?       target user for pending transfer
```

### WorkspaceMember
```
workspaceId   Int    FK → Workspace
userId        Int    FK → User
role          String admin | editor | viewer
```

> The workspace creator is stored as `ownerId` on the Workspace table. The `owner` role is derived — it is not stored in `WorkspaceMember.role`.

### Lead
```
workspaceId     Int       FK → Workspace
leadId          String?   LD0001 format, unique per workspace
name            String
mobile          String
amount          String
sourceLink      String?
status          New | Contacted | In Progress | Closed | Rejected
priority        Low | Medium | High | Urgent
assignedTo      Int?      FK → User
nextFollowup    DateTime?
dipAccount      pending | created
verifiedMobile  Boolean   default: false
```

### DeletedLead
```
workspaceId       Int       FK → Workspace
leadId            String    the reserved LD0001 identifier
notesJson         String?   JSON snapshot of lead_notes at deletion time
originalCreatedAt DateTime
deletedAt         DateTime
deletedBy         Int?      FK → User
```

> Soft-deleted leads are copied here and restored from here. The `leadId` stays reserved permanently — ID generation checks this table so a number is never reused.

### ActivityLog
```
actionType    Lead Created | Lead Assigned | Status Changed | Priority Changed
              Note Added | Lead Updated | Lead Deleted | Lead Restored
              DIP Account Changed | Mobile Verified | Member Invited
              Member Removed | Role Changed
performedBy   Int?      FK → User (null for public API)
leadId        Int?      FK → Lead — nullable so logs survive lead deletion
leadRef       String?   human-readable lead number, survives deletion
oldValue      String?
newValue      String?
ipAddress     String?
timestamp     DateTime
```

### LeadNote
```
leadId      Int    FK → Lead
text        String
addedBy     Int?   FK → User
createdAt   DateTime
```

---

## Role System

| Action | Owner | Admin | Editor | Viewer |
|---|---|---|---|---|
| View all leads | Yes | Yes | No (assigned only) | No (assigned only) |
| Create lead | Yes | Yes | No | No |
| Update any lead | Yes | Yes | No | No |
| Update assigned lead | Yes | Yes | Yes | No |
| Delete lead | Yes | Yes | No | No |
| Restore deleted lead | Yes | Yes | No | No |
| Assign lead | Yes | Yes | No | No |
| Add note | Yes | Yes | Yes (assigned) | No |
| Toggle mobile verified | Yes | Yes | Yes (assigned) | No |
| View analytics | Yes | Yes | No | No |
| View logs | Yes | Yes | Yes | Yes |
| Invite members | Yes | Yes | No | No |
| Remove members | Yes | Yes | No | No |
| Change editor/viewer role | Yes | Yes | No | No |
| Change admin role | Yes | No | No | No |
| Change owner role | No | No | No | No |
| Update workspace settings | Yes | Yes | No | No |
| Transfer ownership | Yes (owner only) | No | No | No |

---

## Real-Time Events (Socket.IO)

Clients join a workspace room by emitting `join:workspace` after connecting.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join:workspace` | `workspaceId` | Subscribe to workspace events |
| `leave:workspace` | `workspaceId` | Unsubscribe from workspace events |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `lead:created` | Lead object | New lead added |
| `lead:updated` | Lead object | Lead data changed |
| `lead:deleted` | `{ id }` | Lead removed |
| `workspace:invited` | Workspace object | User invited to workspace |
| `workspace:ownership-transferred` | `{ workspaceId, newOwnerId }` | Ownership transfer completed |
| `session:force-logout` | — | Evicted by a new login on another device |

**Socket authentication:**
```js
const socket = io(SERVER_URL, {
  auth: { token: '<jwt>' }
});
```

The handshake is rejected if the token is missing or invalid — the connection never reaches the event handlers.

---

## Frontend Architecture

### State Management (Redux Toolkit)

| Slice | Manages |
|---|---|
| `authSlice` | User identity, JWT token, session conflict state |
| `leadSlice` | Lead list, KPI stats, analytics data, pagination, filters, socket handlers |
| `deletedLeadSlice` | Soft-deleted leads and restore actions |
| `workspaceSlice` | Current workspace, all user workspaces |
| `userSlice` | Workspace member list and management |
| `logSlice` | Activity logs, paginated and per-lead |

### Routing

```
/login                  Public
/signup                 Public
/verify-otp             Public
/forgot-password        Public
/reset-password         Public (token in query string)
/workspace/create       Auth required
/                       Auth + workspace required  (Dashboard)
/profile                Auth + workspace required
/workspaces             Auth + workspace required
/analytics              Admin / Owner only
/logs                   All workspace members
/users                  Admin / Owner only
/workspace/settings     Admin / Owner only
/workspace/api-webhook  Admin / Owner only
```

### Axios Interceptors

Every outgoing request automatically attaches:
- `Authorization: Bearer <token>` from localStorage
- `x-workspace-id: <id>` from localStorage

On a `401` the client attempts a single token refresh and retries the original request. If the refresh also fails, local state is cleared and the user is redirected to `/login`.

---

## Scripts

```bash
# Push Prisma schema to database (dev)
cd server && npx prisma db push

# Open Prisma Studio (database GUI)
cd server && npx prisma studio

# Start backend in watch mode (node --watch)
cd server && npm run dev

# Start backend in production mode
cd server && npm start

# Start frontend in development mode
cd client && npm run dev

# Build frontend for production
cd client && npm run build
```

---

<div align="center">

**Developed by [Asjad Farooq](https://www.linkedin.com/in/asjadfarooqconnect)**

[![GitHub](https://img.shields.io/badge/GitHub-Asjadfaroq-181717?style=flat-square&logo=github)](https://github.com/Asjadfaroq/crm-platform)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Asjad_Farooq-0A66C2?style=flat-square&logo=linkedin&logoColor=fff)](https://www.linkedin.com/in/asjadfarooqconnect)
[![Live App](https://img.shields.io/badge/Live_App-Mini_CRM-000000?style=flat-square&logo=vercel&logoColor=fff)](https://crm-platform-delta-ten.vercel.app)

</div>
