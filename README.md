# Sentinel Employee Access Role Management System

Sentinel EARMS is a full-stack employee access and role management system for requesting, reviewing, approving, auditing, and revoking enterprise application access. It provides role-based dashboards for employees, managers, and administrators, with JWT authentication, MongoDB persistence, **multi-level approval workflows** with conditional rules, delegation, escalation, SLA tracking, audit visibility, notifications, and a **local Retrieval-Augmented Generation (RAG) AI assistant** (Cohere embeddings + MongoDB Atlas vector search) with a **Groq fallback** for out-of-knowledge questions.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Approval Workflow System](#approval-workflow-system)
- [Chatbot Assistant (Local RAG + Groq Fallback)](#chatbot-assistant-local-rag--groq-fallback)
- [User Roles](#user-roles)
- [Frontend Routes](#frontend-routes)
- [Deployment Notes](#deployment-notes)
- [Security Notes](#security-notes)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Author](#author)

## Overview

The application centralizes access governance by allowing employees to submit ERP access requests, managers or assigned approvers to review approval queues, and administrators to manage users, role templates, approval workflows, audit logs, analytics, and revocation operations.

Sentinel supports both legacy single-level review and the newer **multi-level approval engine**. New requests are routed through configurable workflows with layers, conditional rules, assigned approvers, delegation, escalation, approval history, and SLA tracking.

## Features

### Employee

- Register and log in with email/password authentication.
- Log in through the Google OAuth endpoint when client Google login is configured.
- Submit access requests with department, job title, requested role, justification, access type, access duration, and risk-related metadata.
- View own requests, request history, approval status, and a **multi-layer approval timeline** with assigned approver names.
- Manage shared profile details and avatar uploads (JPEG/PNG/WebP, max 2 MB).
- Change password from the profile page.
- Use the protected dashboard chatbot assistant.

### Manager / Approver

- Review department/team access requests.
- View **pending approval queue** for assigned workflow layers, sorted by SLA urgency.
- See live SLA status (`slaBreached`, `slaHoursRemaining`) for each pending request.
- View full **approval path** (all layers + their current status) for any request.
- Approve or reject workflow requests with comments, rejection reasons, suggested changes, and resubmit control.
- **Delegate** approval work to another manager/admin (with optional end date) — the original approver is swapped out and a `DELEGATED` history entry is recorded.
- **Escalate** approval requests when needed.
- View team requests and approval history.
- Receive role-specific notifications for pending and urgent work.
- See personal approver statistics (total actions, today’s approvals, daily limit remaining, SLA breaches, average time-to-approve).

### Administrator

- Manage users, activation status, roles, profile data, and user deletion.
- Create, update, and delete role templates.
- Revoke approved access with a reason.
- View audit logs and analytics dashboards.
- View organization-wide dashboard metrics.
- **Workflow management** — create/edit/delete workflows, drag-and-drop layer reordering, duplicate workflows, preview workflow routing.
- **Layer configuration** — define layer name, level, role type (Line Manager / Senior Manager / Head / Senior Director / Admin / Custom), required approvers, `ANY_ONE` vs `ALL_REQUIRED` approval type, SLA hours, escalation toggle, auto-escalate threshold, optional-layer flag.
- **Conditional approval rules** — build nested AND/OR condition trees against `department`, `riskLevel`, `requestedRole`, `jobTitle`, `accessDuration`, `isHighRisk`, `isPermanent`; test rules against sample data; route matching requests to extra target layers.
- **Approval assignments** — assign users to layers with per-department scope, per-day approval limit (system cap = 5), and a backup approver; bulk activate/deactivate.
- **Live approval dashboard** — KPI tiles (total pending, multi-level vs legacy, completed today, SLA breached, escalated), pending-by-workflow breakdown, SLA breach alerts with one-click escalate, and recent activity feed. Auto-refreshes every 60s.
- **SLA & metrics** — SLA summary metrics, full SLA report, escalation history, approval-dashboard summary, manual escalation trigger.
- Manually trigger the escalation check from the admin API.

### Platform

- Role-based protected routes for employee, manager, and admin users.
- JWT authentication and authorization middleware.
- Password hashing with bcrypt.
- MongoDB Atlas (with **vector search index** for RAG) or local MongoDB persistence through Mongoose.
- Profile avatar uploads with Multer (2 MB cap, image MIME-type filter, served from `/uploads`).
- Request risk classification.
- **Multi-level workflow routing** with approval layers, conditional rules, and parallel/sequential/conditional types.
- **Per-approver daily limit** support (capped at 5/day).
- **Append-only approval history** records for approval, rejection, delegation, escalation, and skip events.
- **SLA deadline tracking** and **automatic escalation cron every 15 minutes**.
- Notification API for dashboard alerts and pending approval badges.
- **Audit logs** with an extended enum covering workflow/layer/rule/assignment lifecycle events.
- **Local RAG chatbot** powered by **Cohere embeddings** (`embed-english-light-v3.0`) and **MongoDB Atlas `$vectorSearch`**, with a **Groq** (`llama-3.1-8b-instant`) fallback when no confident RAG answer is found.
- Health check endpoint for deployment monitoring.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 7, React Router 7 |
| API | Node.js, Express 5 |
| Database | MongoDB Atlas (vector-search enabled) or local MongoDB, Mongoose 9 |
| Authentication | JWT, bcryptjs, Google OAuth callback route |
| HTTP Client | Axios |
| File Uploads | Multer |
| **AI — RAG embeddings** | **Cohere `embed-english-light-v3.0`** (separate `search_document` / `search_query` inputs) |
| **AI — vector store** | **MongoDB Atlas `$vectorSearch`** on the `knowledgechunks` collection (index: `vector_index`) |
| **AI — LLM fallback** | Groq OpenAI-compatible chat completions, model `llama-3.1-8b-instant` |
| Optional / Legacy Local AI | Ollama (`llama3.2:1b` + `nomic-embed-text`), local RAG service files (retained for experimentation, not mounted) |
| Client Config | Firebase SDK |
| Tooling | ESLint, Nodemon |

## Architecture

```text
client/                          React + Vite frontend
  src/
    api/                         Axios API client
    components/                  Shared UI, chatbot widget, admin workflow components
    |  +-- Admin/                WorkflowBuilder, ApprovalLayerConfig, RuleBuilder,
    |  |                         ApprovalAuthorityGrid, ApprovalMetricsCard, CreateUserModal
    contexts/                    Authentication context
    layouts/                     Public and dashboard layouts
    pages/                       Public, auth, employee, manager, admin pages
    |  +-- admin/                AdminHome, ApprovalDashboard, WorkflowManagementPage,
    |  |                         ApprovalLayerConfigPage, ApprovalRulesPage,
    |  |                         ApprovalAuthorityPage, ApprovalMetricsPage, …
    routes/                      Protected route handling
    services/                    chatbot, approval, workflow API clients
    styles/                      Dark theme design tokens

server/                          Express API
  config/                        MongoDB connection
  controllers/                   Auth, dashboard, requests, roles, users
  middleware/                    Auth, role authorization, workflow checks (validation, authority, daily limit)
  models/                        User, AccessRequest, RoleTemplate, AuditLog,
    |                            ApprovalWorkflow, ApprovalLayer, ApprovalRule,
    |                            ApprovalAssignment, ApprovalHistory, KnowledgeChunk
  routes/                        auth, dashboard, users, requests, roles, audit,
    |                            notifications, chatbot, workflow (admin), approval (approver)
  services/                      groqService (LLM fallback), chatbotService (RAG pipeline),
    |                            embeddingService (Cohere), workflowEngine, routingEngine,
    |                            slaService, escalationService, ollamaService (legacy)
  scripts/                       indexKnowledge (rebuilds the vector knowledge base)
  utils/                         Audit and workflow helper utilities
  rag/                           Legacy local RAG knowledge base and helpers
```

## Project Structure

```text
Employee_Access_Mgt_System/
+-- client/
|   +-- src/
|   |   +-- api/
|   |   +-- components/
|   |   |   +-- Admin/
|   |   +-- contexts/
|   |   +-- layouts/
|   |   +-- pages/
|   |   |   +-- admin/
|   |   |   +-- auth/
|   |   |   +-- employee/
|   |   |   +-- manager/
|   |   |   +-- shared/
|   |   +-- routes/
|   |   +-- services/
|   |   +-- styles/
|   |   +-- utils/
|   +-- public/
|   +-- package.json
|   +-- vite.config.js
+-- server/
|   +-- config/
|   +-- controllers/
|   +-- database/
|   +-- middleware/
|   +-- models/
|   +-- rag/
|   +-- routes/
|   +-- scripts/
|   +-- services/
|   +-- utils/
|   +-- server.js
|   +-- package.json
+-- docs/
+-- README.md
```

## Getting Started

### Prerequisites

- Node.js 20 or newer recommended
- npm
- **MongoDB Atlas** cluster (the RAG chatbot relies on the Atlas `$vectorSearch` stage — a local MongoDB will not work for the RAG flow)
- **Cohere API key** (for embeddings)
- **Groq API key** (for the LLM fallback)
- Firebase project credentials if Firebase-backed client features are enabled
- Optional: Ollama if you want to experiment with the legacy local RAG/Ollama service

### Installation

Install dependencies for the server and client:

```bash
cd server
npm install

cd ../client
npm install
```

### Build the RAG knowledge base (one-time, and after role/workflow changes)

The chatbot retrieves from the `knowledgechunks` collection. Rebuild it whenever you add roles or workflows:

```bash
cd server
node scripts/indexKnowledge.js
```

This script:

1. Wipes existing `policy`, `role`, and `workflow` chunks (request chunks have a TTL and are kept).
2. Loads all active roles and workflows from MongoDB.
3. Embeds them in batches of 16 via **Cohere** (`embed-english-light-v3.0`).
4. Writes the chunks + their vectors into `knowledgechunks`, ready for `$vectorSearch`.

> **MongoDB Atlas requirement:** your cluster must have a vector search index named **`vector_index`** on the `knowledgechunks.embedding` field before the chatbot can answer from the RAG store.

### Run the Application

Start the API server:

```bash
cd server
npm run dev
```

The server runs on:

```text
http://localhost:5000
```

Start the frontend in a second terminal:

```bash
cd client
npm run dev
```

The client runs on:

```text
http://localhost:5173
```

Check server health:

```text
GET http://localhost:5000/api/health
```

## Environment Variables

Create `server/.env` for local development:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_strong_jwt_secret
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173

# AI — Local RAG (active)
COHERE_API_KEY=your_cohere_api_key

# AI — LLM fallback
GROQ_API_KEY=your_groq_api_key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.1-8b-instant

# Optional legacy local AI settings (not mounted by default)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_GENERATION_MODEL=llama3.2:1b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Optional server-side Google/Firebase settings
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_service_account_email
```

Create `client/.env.local` or `client/.env` as needed:

```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Do not commit real secrets, database credentials, JWT secrets, Cohere keys, Groq keys, Firebase private keys, or production API keys. If a key is exposed, rotate it immediately.

## Available Scripts

### Server

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express server with Nodemon |
| `npm start` | Start the Express server with Node |

### Client

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production frontend |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

### Knowledge base

| Command | Description |
| --- | --- |
| `node server/scripts/indexKnowledge.js` | Rebuild the RAG knowledge chunks in MongoDB |

## API Overview

Base URL:

```text
http://localhost:5000/api
```

| Module | Endpoint Prefix | Purpose |
| --- | --- | --- |
| Health | `/health` | API status check |
| Auth | `/auth` | Register, login, current user, Google login, password changes |
| Dashboard | `/dashboard` | Dashboard metrics and summaries |
| Users | `/users` | Profile updates, avatar upload, user management, role assignment |
| Requests | `/requests` | Access request submission, listing, review, revocation, approval status, approval timeline |
| Roles | `/roles` | Role template management |
| Audit | `/audit` | Admin audit log access |
| Notifications | `/notifications` | Role-aware dashboard notifications |
| Chatbot | `/chatbot` | RAG-first AI assistant with Groq fallback |
| Admin Workflows | `/admin` | Workflow, layer, rule, assignment, SLA, escalation APIs |
| Approver Queue | `/approver` | Pending approvals, approval details, approval statistics, bulk approvers, delegation candidates |
| Approval Actions | `/approvals` | Approve, reject, delegate, escalate workflow requests |

Most API routes require a bearer token:

```http
Authorization: Bearer <jwt_token>
```

### Important Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register a user |
| `POST` | `/api/auth/login` | Log in with email/password |
| `POST` | `/api/auth/google` | Log in or link account with Google payload |
| `GET` | `/api/dashboard` | Get dashboard summary |
| `POST` | `/api/requests` | Submit an access request |
| `GET` | `/api/requests/my` | Employee request list |
| `GET` | `/api/requests/team` | Manager department/team requests |
| `GET` | `/api/requests` | Role-aware request list |
| `PATCH` | `/api/requests/:id/review` | Legacy manager approve/reject route |
| `PATCH` | `/api/requests/:id/revoke` | Admin revokes approved access |
| `GET` | `/api/requests/:requestId/approval-status` | Request approval status |
| `GET` | `/api/requests/:requestId/approval-timeline` | Request approval timeline |
| `GET` | `/api/approver/pending-approvals` | Pending workflow approvals (sorted by SLA) |
| `GET` | `/api/approver/pending-approvals/:requestId/details` | Approval details and full path |
| `GET` | `/api/approver/approval-statistics` | Personal approver statistics |
| `GET` | `/api/approver/delegation-candidates/:requestId` | Suggested delegatees (assigned, backup, department, admin) |
| `POST` | `/api/approver/bulk-approvers` | Look up assigned users for many layers at once (used by the approval timeline UI) |
| `PUT` | `/api/approvals/:requestId/approve` | Approve current workflow layer |
| `PUT` | `/api/approvals/:requestId/reject` | Reject current workflow layer |
| `POST` | `/api/approvals/:requestId/delegate` | Delegate approval to another manager/admin |
| `POST` | `/api/approvals/:requestId/escalate` | Manually escalate (admin) |
| `POST` | `/api/chatbot/message` | Send chatbot message (RAG-first, Groq fallback) |
| `POST` | `/api/chatbot/ask` | Send a direct chatbot prompt |
| `POST` | `/api/admin/workflows` | Create a new approval workflow |
| `GET`  | `/api/admin/workflows` | List workflows (filterable) |
| `GET`  | `/api/admin/workflows/:workflowId/preview` | Preview a workflow and its layers |
| `PUT`  | `/api/admin/workflows/:workflowId` | Update a workflow |
| `DELETE` | `/api/admin/workflows/:workflowId` | Delete a workflow |
| `*`  | `/api/admin/workflows/:workflowId/layers` | Create/list layers for a workflow |
| `PUT`  | `/api/admin/layers/:layerId` | Update a layer |
| `DELETE` | `/api/admin/layers/:layerId` | Delete a layer |
| `PUT`  | `/api/admin/layers/:layerId/reorder` | Reorder a layer |
| `*`  | `/api/admin/workflows/:workflowId/rules` | Create/list conditional rules |
| `PUT`  | `/api/admin/rules/:ruleId` | Update a rule |
| `DELETE` | `/api/admin/rules/:ruleId` | Delete a rule |
| `POST` | `/api/admin/rules/:ruleId/test` | Test a rule against a sample condition |
| `*`  | `/api/admin/approval-assignments` | List / create approver assignments |
| `PUT`  | `/api/admin/approval-assignments/:id` | Update an assignment |
| `DELETE` | `/api/admin/approval-assignments/:id` | Remove an assignment |
| `GET`  | `/api/admin/users/:userId/assigned-layers` | Layers a user is assigned to |
| `GET`  | `/api/admin/sla-metrics` | SLA summary metrics |
| `GET`  | `/api/admin/sla-report` | Full SLA report |
| `GET`  | `/api/admin/escalation-history` | Escalation history |
| `POST` | `/api/admin/escalation/run` | Manually run the escalation cron check |
| `GET`  | `/api/admin/approval-dashboard` | Approval dashboard summary (KPIs + recent activity) |

## Approval Workflow System

The workflow system is built around these models:

| Model | Purpose |
| --- | --- |
| `ApprovalWorkflow` | Top-level workflow definition + matching metadata (access type, department, risk, priority) |
| `ApprovalLayer` | One step in a workflow (role type, SLA, approval type, escalation rules) |
| `ApprovalRule` | Conditional routing rule — nested AND/OR condition tree + target layers |
| `ApprovalAssignment` | Maps a user (and an optional backup) to a layer with daily approval limit + department scope |
| `ApprovalHistory` | Append-only record of every approval action (approve, reject, delegate, escalate, skip) |
| `AccessRequest` | Request lifecycle + workflow status / timeline fields |
| `KnowledgeChunk` | Vector-stored policy/role/workflow/request chunks used by the RAG chatbot |

### Workflow Behavior

1. Employee submits an access request.
2. The **workflow engine** matches the request against active workflows by access type, department, risk level, and priority, then evaluates conditional rules.
3. Matching workflows create layer statuses and assign the matching `ApprovalAssignment` users as `currentApproverIds`.
4. Assigned approvers see pending items in `GET /api/approver/pending-approvals` (sorted by SLA deadline).
5. Approvers **approve**, **reject** (with optional `resubmitAllowed`), **delegate** (swap themselves for another manager/admin), or **escalate**.
6. Every action writes an `ApprovalHistory` entry and a corresponding `AuditLog` event.
7. When the final layer is approved, the request becomes `Approved` (`WORKFLOW_COMPLETED`). On rejection, the request returns to the employee.
8. The **escalation cron** (every 15 min) checks pending requests whose SLA deadline has passed and escalates them through `escalationService`.

### Layer Configuration Fields

| Field | Description |
| --- | --- |
| `layerName` | Display name (e.g. “Line Manager”) |
| `layerLevel` | Order in the chain (1 = first) |
| `approvalRoleType` | `LINE_MANAGER`, `SENIOR_MANAGER`, `HEAD`, `SENIOR_DIRECTOR`, `ADMIN`, `CUSTOM` |
| `requiredApprovers` | Minimum distinct approvers required at this layer |
| `approvalType` | `ANY_ONE` (any single approver can move it forward) or `ALL_REQUIRED` (every approver must act) |
| `slaHours` | Working hours before SLA breach |
| `autoEscalateAfterHours` | Hours before auto-escalation triggers |
| `escalationEnabled` | Toggle for cron-based escalation |
| `isOptional` | Layer can be skipped if a higher-layer approver acts first |

### Admin Workflow APIs

| Endpoint | Purpose |
| --- | --- |
| `/api/admin/workflows` | Create, list, update, delete workflows |
| `/api/admin/workflows/:workflowId/preview` | Preview workflow routing + layers |
| `/api/admin/workflows/:workflowId/layers` | Manage workflow layers |
| `/api/admin/layers/:layerId/reorder` | Reorder layers (drag-and-drop in UI) |
| `/api/admin/workflows/:workflowId/rules` | Manage conditional rules |
| `/api/admin/rules/:ruleId/test` | Test a rule condition |
| `/api/admin/approval-assignments` | Assign approvers to layers (per department, with daily cap + backup) |
| `/api/admin/users/:userId/assigned-layers` | View a user’s layer assignments |
| `/api/admin/sla-metrics` | SLA summary metrics |
| `/api/admin/sla-report` | SLA report |
| `/api/admin/escalation-history` | Escalation history |
| `/api/admin/escalation/run` | Manually run escalation check |
| `/api/admin/approval-dashboard` | Live approval dashboard summary |

The server starts the **escalation cron automatically every 15 minutes**. It checks pending requests whose SLA deadlines have passed and escalates them through `escalationService`.

## Chatbot Assistant (Local RAG + Groq Fallback)

The chatbot route (`server/routes/chatbotRoutes.js`) is an **RAG-first pipeline** with a **Groq fallback**:

1. **Step 1 — Local RAG.** `chatbotService.answerQuestion` embeds the user’s question via **Cohere** (`embed-english-light-v3.0`, `input_type=search_query`) and runs a **MongoDB Atlas `$vectorSearch`** against the `knowledgechunks` collection (index name: `vector_index`). For request-specific questions it also fetches live `AccessRequest` docs (which aren’t stored in the vector index for privacy/freshness) and merges them with the retrieved chunks.
2. **Step 2 — Direct DB answers** for count/stat questions (e.g. “How many employees?”) and lightweight summaries, recommendations, and risk explanations are answered from MongoDB without an LLM.
3. **Step 3 — Groq fallback.** If the RAG answer confidence is low (no retrieved sources with `score > 0` or no confident live answer), the route retrieves context once more, builds a context-enriched prompt, and calls `groqService` (`llama-3.1-8b-instant`) for the final answer.

The response shape (consistent across RAG and fallback paths) is:

```json
{
  "reply":       "Final answer",
  "answer":      "Final answer",
  "message":     "Final answer",
  "sources":     [{ "id": "…", "title": "…", "type": "policy|role|workflow|request", "score": 0.87 }],
  "suggestions": ["Show my pending requests", "Explain risk levels"],
  "mode":        "local-rag" | "groq-fallback"
}
```

Endpoints:

```text
POST /api/chatbot/message    # main endpoint, body: { "message": "…" }
POST /api/chatbot/ask        # lightweight direct-prompt endpoint, body: { "prompt": "…" }
```

### Building the knowledge base

Run after any change to roles or workflows (and once on first install):

```bash
cd server
node scripts/indexKnowledge.js
```

> The `knowledgechunks.embedding` field must have a **MongoDB Atlas vector search index** named `vector_index` for `$vectorSearch` to work. The chatbot will gracefully fall back to keyword scoring if the vector search errors out.

### Legacy Local RAG / Ollama Files

The repo still contains local AI/RAG files (retained for experimentation, **not mounted by the current chatbot route**):

- `server/services/ollamaService.js`
- `server/services/chatbotService.js` (this *is* the active RAG pipeline — the legacy entry is the Ollama helper used by the older rag files)
- `server/rag/ragService.js`
- `server/rag/knowledgeBase.js`

Optional Ollama setup (only if you rewire the route to use it):

```bash
ollama pull llama3.2:1b
ollama pull nomic-embed-text
ollama serve
```

## User Roles

| Role | Access Scope |
| --- | --- |
| `employee` | Submit requests, view own requests/history/timeline, manage profile (avatar, password), use chatbot |
| `manager` | Review team requests, work assigned approval queue, approve/reject/delegate/escalate, view approval history, see personal statistics |
| `admin` | Manage users, roles, workflows, approvals, audit logs, analytics, revocation, SLA/escalation data, run escalation cron manually, manage RAG knowledge base |

## Frontend Routes

| Route | Access | Page |
| --- | --- | --- |
| `/` | Public | `LandingPage` |
| `/login` | Public | `LoginPage` |
| `/register` | Public | `RegisterPage` |
| `/about` | Public | `AboutPage` (inline) |
| `/support` | Public | `SupportPage` (inline) |
| `/dashboard` | All authenticated | Role-specific dashboard home |
| `/dashboard/profile` | All authenticated | `ProfilePage` (avatar upload + password change) |
| `/dashboard/submit-request` | Employee | `SubmitRequestPage` |
| `/dashboard/my-requests` | Employee | `MyRequestsPage` |
| `/dashboard/history` | Employee | `RequestHistoryPage` |
| `/dashboard/review-requests` | Manager | `ReviewRequestsPage` (assigned queue) |
| `/dashboard/team-requests` | Manager | `TeamRequestsPage` |
| `/dashboard/approval-history` | Manager | `ApprovalHistoryPage` |
| `/dashboard/approval-queue` | Admin | `ReviewRequestsPage` (admin queue view) |
| `/dashboard/manage-roles` | Admin | `ManageRolesPage` |
| `/dashboard/manage-users` | Admin | `ManageUsersPage` |
| `/dashboard/audit-logs` | Admin | `AuditLogsPage` |
| `/dashboard/analytics` | Admin | `AnalyticsPage` |
| `/dashboard/revoke-access` | Admin | `RevokeAccessPage` |

The following **new admin pages** are present in `client/src/pages/admin/` and have matching service calls in `client/src/services/workflowService.js` / `approvalService.js`, but are **not yet wired into `App.jsx`** — confirm routing before relying on them in the live UI:

- `ApprovalDashboard.jsx` (KPI tiles + SLA alerts + recent activity + manual escalation)
- `WorkflowManagementPage.jsx` (drag-and-drop layer builder + workflow CRUD)
- `ApprovalLayerConfigPage.jsx`
- `ApprovalRulesPage.jsx` (nested AND/OR rule builder with test runner)
- `ApprovalAuthorityPage.jsx` (assign users to layers with daily cap, backup, bulk activate/deactivate)
- `ApprovalMetricsPage.jsx` (SLA summary + escalation history)
- `UserManagementPage.jsx` (alternate user management view, alongside `ManageUsersPage`)
- `AdminHome.jsx` (alternate admin landing)

Supporting admin components in `client/src/components/Admin/`:

- `WorkflowBuilder.jsx` (drag-and-drop layer canvas)
- `ApprovalLayerConfig.jsx` (layer form)
- `RuleBuilder.jsx` (recursive condition node editor)
- `ApprovalAuthorityGrid.jsx` (searchable + bulk-action assignment table)
- `ApprovalMetricsCard.jsx` (KPI tile with ring/bar chart)
- `CreateUserModal.jsx`

## Deployment Notes

### Render Backend

Set the backend environment variables directly in Render. Render environment variables override values from example files.

Important production values:

```env
NODE_ENV=production
MONGO_URI=your_production_mongodb_atlas_connection_string
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRE=7d
CLIENT_URL=https://sentinel-earms.netlify.app

# AI — local RAG
COHERE_API_KEY=your_cohere_api_key

# AI — LLM fallback
GROQ_API_KEY=your_groq_api_key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.1-8b-instant
```

> **MongoDB Atlas** must have a vector search index named `vector_index` on `knowledgechunks.embedding` for the RAG pipeline to work in production. Run `node server/scripts/indexKnowledge.js` against the production DB after first deploy (and whenever you change roles or workflows).

If logs show `getaddrinfo ENOTFOUND api.groq.ai`, Render still has an old `GROQ_API_URL`. Replace it with `https://api.groq.com/openai/v1/chat/completions` or remove it so the code fallback is used.

If logs show `model_decommissioned`, Render still has an old `GROQ_MODEL`. Replace it with `llama-3.1-8b-instant`.

### Netlify Frontend

Set:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api
```

Also configure any Firebase client variables needed by the deployed frontend.

## Security Notes

- Passwords are hashed with **bcryptjs** before storage.
- JWT tokens are required for protected API routes.
- Authorization middleware restricts role-specific endpoints.
- **Audit logs** are created for important actions including: request submission, approval, rejection, delegation, escalation, role changes, profile updates, password changes, account activation/deactivation, user deletion, access revocation, **and the full workflow/layer/rule/assignment lifecycle** (`WORKFLOW_CREATED`, `LAYER_APPROVED`, `RULE_CREATED`, `APPROVAL_ASSIGNMENT_CREATED`, `WORKFLOW_COMPLETED`, `SLA_BREACHED`, `AUTO_ESCALATION_FIRED`, etc.).
- **Approval history records** are designed as append-only approval action records.
- **Avatar uploads** are limited to 2 MB and to `jpeg`, `jpg`, `png`, `webp` MIME types.
- **CORS** is restricted by `CLIENT_URL`.
- **Daily approval limit** of 5 per approver is enforced server-side via `checkDailyLimit` middleware.
- Use strong production `JWT_SECRET` values.
- Rotate any exposed API key (Cohere, Groq, MongoDB, Firebase) immediately.
- Never commit real `.env` files or secrets.
- The RAG pipeline never stores live `AccessRequest` content in the vector index — request data is fetched per-query for privacy and freshness.

## Development Workflow

1. Create or update local environment files (`server/.env`, `client/.env.local`).
2. Make sure your MongoDB Atlas cluster has a vector search index named `vector_index` on `knowledgechunks.embedding`.
3. Start the server with `npm run dev` inside `server`.
4. (One-time / after role/workflow changes) Run `node server/scripts/indexKnowledge.js` inside `server` to seed the RAG knowledge base.
5. Start the client with `npm run dev` inside `client`.
6. Use the frontend at `http://localhost:5173`.
7. Validate API availability through `/api/health`.
8. Run syntax checks for touched backend files when useful:

```bash
node -c server/services/groqService.js
node -c server/services/chatbotService.js
node -c server/routes/chatbotRoutes.js
```

9. Run frontend linting before submitting UI changes:

```bash
cd client
npm run lint
```

## Troubleshooting

### Chatbot returns `ENOTFOUND api.groq.ai`

The Groq host is wrong. Use:

```env
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
```

Update Render and redeploy/restart the backend.

### Chatbot returns `400 model_decommissioned`

The model is retired. Use:

```env
GROQ_MODEL=llama-3.1-8b-instant
```

Update Render and redeploy/restart the backend.

### Chatbot says it cannot process a question

Check backend logs for the real error. Common causes:

- Missing `COHERE_API_KEY` → RAG embeddings fail.
- Missing `GROQ_API_KEY` → fallback LLM fails.
- Wrong `GROQ_API_URL` or retired `GROQ_MODEL`.
- Missing MongoDB Atlas `vector_index` on `knowledgechunks.embedding` → vector search errors out and the pipeline falls back to keyword scoring (still returns an answer, but less precise).
- Cohere or Groq rate limits.

### Chatbot always answers from Groq (never from RAG)

The RAG pipeline returns its answer only when retrieved sources have a real score **and** `answerFromContext` produced a non-null result. If policy-only hits are being scored but `answerFromContext` returns `null` (intentional design), the route falls through to Groq. Confirm you have at least one indexed **role** or **workflow** chunk that matches the question — re-run `node server/scripts/indexKnowledge.js`.

### Browser cannot reach the API

Confirm `VITE_API_URL` points to the backend `/api` base URL, and confirm backend `CLIENT_URL` matches the deployed frontend origin.

### Local login works but protected routes fail

Confirm the JWT secret is set, the token is stored by the client, and requests include:

```http
Authorization: Bearer <jwt_token>
```

### Avatar / file uploads fail

Check file type (must be `jpeg`, `jpg`, `png`, or `webp`), file size (max 2 MB), and whether the server can write to the `uploads/` directory in the deployment environment.

### Approver hit the daily approval limit

Each approver can complete at most **5 approvals per day** (system cap, enforced by `checkDailyLimit` middleware). The UI surfaces `dailyLimitRemaining` from `/api/approver/approval-statistics`. Either wait until the next day, delegate, or escalate the request.

### Vector search returns an error and chatbot falls back

This is **expected** when the MongoDB Atlas `vector_index` is missing, the cluster doesn’t support `$vectorSearch`, or the Cohere embedding call failed. The chatbot service logs a warning and falls back to keyword scoring. Fix the root cause (create the index, rotate the API key, etc.) and re-run `node server/scripts/indexKnowledge.js` if you also need to refresh chunks.

## Author

Made by Kazi Fabiha Golam Liya.
