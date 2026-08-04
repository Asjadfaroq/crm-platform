# Mini CRM

A full-stack, multi-workspace CRM system for managing leads, teams, and sales pipelines — with real-time updates, role-based access control (including ownership transfer), activity compliance logging, analytics dashboard, email notifications, and a public API for external lead submission.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
  - [Database Setup](#database-setup)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Leads](#leads)
  - [Workspaces](#workspaces)
  - [Users](#users)
  - [Logs](#logs)
  - [Public API](#public-api)
- [Data Models](#data-models)
- [Role System](#role-system)
- [Real-Time Events (Socket.IO)](#real-time-events-socketio)
- [Frontend Architecture](#frontend-architecture)
- [Scripts](#scripts)

---

## Overview

Mini CRM is a multi-tenant CRM built for small sales teams. Each user can belong to multiple **workspaces**, and each workspace has its own isolated set of leads, members, and compliance activity logs. Leads can be submitted externally via an API key, tracked through a full pipeline, assigned to team members, and commented on — all with a live-updating dashboard and an admin-only analytics view.

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | HTTP server and REST API |
| Prisma ORM | Database access layer |
| Azure SQL Server (MSSQL) | Relational database |
| Socket.IO | Real-time WebSocket events |
| JSON Web Tokens (JWT) | Authentication |
| bcryptjs | Password hashing |
| Nodemailer (Office365 SMTP) | Password reset, invitations, OTP emails |
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

```
democrm/
├── client/                          # React frontend
│   ├── .env                         # VITE_API_URL, VITE_WS_URL
│   └── src/
│       ├── api/
│       │   ├── axios.js             # Axios instance with JWT + workspace interceptors
│       │   └── socket.js            # Socket.IO singleton client (falls back to window.location.host)
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
│       │   ├── LogsPage.jsx         # Activity audit logs (compliance — logs survive lead deletion)
│       │   ├── ResetPasswordPage.jsx
│       │   ├── SignupPage.jsx
│       │   ├── WorkspacesPage.jsx   # Workspace switcher
│       │   ├── CreateWorkspacePage.jsx
│       │   ├── UsersPage.jsx        # Member management with owner/admin/editor/viewer badges
│       │   └── WorkspaceSettingsPage.jsx  # Includes ownership transfer via OTP
│       └── store/
│           ├── index.js             # Redux store
│           └── slices/
│               ├── authSlice.js
│               ├── leadSlice.js     # Leads, KPI stats, analytics, socket handlers
│               ├── logSlice.js
│               ├── userSlice.js
│               └── workspaceSlice.js
│
└── server/                          # Express backend
    ├── prisma/
    │   └── schema.prisma            # Prisma schema (Azure SQL Server)
    └── src/
        ├── index.js                 # App entry point, Socket.IO setup, CORS config
        ├── config/
        │   └── db.js                # Prisma client singleton
        ├── controllers/
        │   ├── authController.js    # login, signup, forgot/reset password
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
        │   ├── emailService.js      # Nodemailer — password reset, invite, OTP emails
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
- **Session conflict detection** — logging in from a new device notifies and optionally evicts the old session via WebSocket
- Force-login flag to override existing sessions
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
- SQL Server (local or Azure SQL)
- An SMTP account for email (Office365 or equivalent)

### Environment Variables

**`server/.env`**

```env
PORT=5003

# Prisma / Azure SQL Server
DATABASE_URL=sqlserver://<host>:1433;database=<dbname>;user=<user>;password=<pass>;trustServerCertificate=true;encrypt=false

# JWT
JWT_SECRET=replace_with_a_long_random_string
JWT_REFRESH_SECRET=replace_with_another_long_random_string

# Public API key (sent in x-api-key header)
API_KEY=your_public_api_key

# Frontend origin — used in email links and CORS
CLIENT_URL=http://localhost:5173

# CORS — comma-separated list of allowed frontend origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# SMTP (Office365 example)
SMTP_SERVICE=smtp.office365.com
SMTP_PORT=587
SMTP_MAIL=yourmail@example.com
SMTP_PASSWORD=yourpassword
SMTP_SECURE=false
```

**`client/.env`**

```env
# Leave empty in dev — Vite proxy forwards /api to the dev server
VITE_API_URL=

# Backend URL for Socket.IO (dev: full localhost URL, prod: backend domain)
VITE_WS_URL=http://localhost:5003
```

> In production set `VITE_API_URL=https://your-backend-domain.com` and `VITE_WS_URL=https://your-backend-domain.com`.

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

# Push the Prisma schema to your SQL Server database
npx prisma db push

# (Optional) Open Prisma Studio to inspect data
npx prisma studio
```

> For production schema changes, generate a SQL diff:
> ```bash
> npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
> ```
> Then run the output SQL manually in Azure Portal → Query editor.

---

## API Reference

All protected endpoints require:
- `Authorization: Bearer <token>` header
- `x-workspace-id: <workspaceId>` header (for workspace-scoped routes)

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Login and receive JWT | Public |
| POST | `/api/auth/signup` | Self-register | Public |
| GET | `/api/auth/me` | Get current user + workspaces | Required |
| POST | `/api/auth/logout` | Invalidate session token | Required |
| POST | `/api/auth/forgot-password` | Send password reset email | Public |
| POST | `/api/auth/reset-password` | Reset password via token | Public |
| POST | `/api/auth/refresh` | Refresh access token | Public (refresh token) |

---

### Leads

All routes require auth + workspace membership.

| Method | Endpoint | Description | Role |
|---|---|---|---|
| GET | `/api/leads` | List leads (paginated, filterable) | All |
| GET | `/api/leads/stats` | Dashboard KPI stats | All |
| GET | `/api/leads/analytics` | Full analytics aggregation | Admin / Owner |
| GET | `/api/leads/:id` | Get single lead | All |
| POST | `/api/leads` | Create lead | Admin / Owner |
| PUT | `/api/leads/:id` | Update lead | Admin / Owner / Editor (assigned) |
| DELETE | `/api/leads/:id` | Delete lead | Admin / Owner |
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

> Logs for deleted leads are retained with `leadId = null`. The `oldValue` field preserves the lead's ID, name, and mobile at the time of deletion.

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

### ActivityLog
```
actionType    Lead Created | Lead Assigned | Status Changed | Priority Changed
              Note Added | Lead Updated | Lead Deleted | DIP Account Changed | Mobile Verified
performedBy   Int?      FK → User (null for public API)
leadId        Int?      FK → Lead — nullable so logs survive lead deletion
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

---

## Frontend Architecture

### State Management (Redux Toolkit)

| Slice | Manages |
|---|---|
| `authSlice` | User identity, JWT token, session conflict state |
| `leadSlice` | Lead list, KPI stats, analytics data, pagination, filters, socket handlers |
| `workspaceSlice` | Current workspace, all user workspaces |
| `userSlice` | Workspace member list and management |
| `logSlice` | Activity logs, paginated and per-lead |

### Routing

```
/login                  Public
/signup                 Public
/forgot-password        Public
/reset-password         Public (token in query string)
/workspace/create       Auth required
/                       Auth + workspace required  (Dashboard)
/workspaces             Auth + workspace required
/analytics              Admin / Owner only
/logs                   All workspace members
/workspace/settings     Admin / Owner only
/workspace/api-webhook  Admin / Owner only
```

### Axios Interceptors

Every outgoing request automatically attaches:
- `Authorization: Bearer <token>` from Redux state
- `x-workspace-id: <id>` from localStorage

On a `401` response, the user is redirected to `/login` and state is cleared.

---

## Scripts

```bash
# Push Prisma schema to database (dev)
cd server && npx prisma db push

# Open Prisma Studio (database GUI)
cd server && npx prisma studio

# Start backend in development mode (nodemon)
cd server && npm run dev

# Start frontend in development mode
cd client && npm run dev

# Build frontend for production
cd client && npm run build
```
