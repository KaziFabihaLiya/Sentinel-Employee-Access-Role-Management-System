# Sentinel Employee Access Role Management System

Sentinel EARMS is a full-stack employee access and role management system for requesting, reviewing, approving, auditing, and revoking enterprise application access. It provides role-based dashboards for employees, managers, and administrators, with JWT authentication, MongoDB persistence, multi-level approval workflows, SLA escalation, audit visibility, notifications, and an AI chatbot assistant.

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
- [Chatbot Assistant](#chatbot-assistant)
- [User Roles](#user-roles)
- [Deployment Notes](#deployment-notes)
- [Security Notes](#security-notes)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Author](#author)

## Overview

The application centralizes access governance by allowing employees to submit ERP access requests, managers or assigned approvers to review approval queues, and administrators to manage users, role templates, approval workflows, audit logs, analytics, and revocation operations.

Sentinel supports both legacy single-level review and the newer multi-level approval engine. New requests can be routed through configurable workflows with layers, rules, assigned approvers, delegation, escalation, approval history, and SLA tracking.

## Features

### Employee

- Register and log in with email/password authentication.
- Log in through the Google OAuth endpoint when client Google login is configured.
- Submit access requests with department, job title, requested role, justification, access type, access duration, and risk-related metadata.
- View own requests, request history, approval status, and multi-layer approval timeline.
- Manage shared profile details and avatar uploads.
- Use the protected dashboard chatbot assistant.

### Manager / Approver

- Review department/team access requests.
- View pending approval queue for assigned workflow layers.
- Approve or reject workflow requests with comments and rejection details.
- Delegate approval work to another eligible user.
- Escalate approval requests when needed.
- View team requests and approval history.
- Receive role-specific notifications for pending and urgent work.

### Administrator

- Manage users, activation status, roles, profile data, and user deletion.
- Create, update, and delete role templates.
- Revoke approved access with a reason.
- View audit logs and analytics dashboards.
- View organization-wide dashboard metrics.
- Manage approval workflows, workflow layers, conditional approval rules, and approval assignments through backend APIs.
- Review SLA metrics, SLA reports, escalation history, and approval dashboard data.
- Manually trigger the escalation check from the admin API.

### Platform

- Role-based protected routes for employee, manager, and admin users.
- JWT authentication and authorization middleware.
- Password hashing with bcrypt.
- MongoDB Atlas or local MongoDB persistence through Mongoose.
- Profile avatar uploads with Multer.
- Request risk classification.
- Multi-level workflow routing with approval layers and conditional rules.
- Approval assignment daily limit support.
- Approval history records for approval, rejection, delegation, and escalation events.
- SLA deadline tracking and automatic escalation cron every 15 minutes.
- Notification API for dashboard alerts and pending approval badges.
- Audit logs for security-relevant lifecycle events.
- Groq-backed chatbot endpoint using an OpenAI-compatible chat completions API.
- Legacy local RAG/Ollama service files remain in the codebase for future/local experimentation, but the mounted chatbot route currently uses Groq.
- Health check endpoint for deployment monitoring.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 7, React Router 7 |
| API | Node.js, Express 5 |
| Database | MongoDB Atlas or local MongoDB, Mongoose |
| Authentication | JWT, bcryptjs, Google OAuth callback route |
| HTTP Client | Axios |
| File Uploads | Multer |
| AI Chatbot | Groq OpenAI-compatible chat completions API |
| Optional / Legacy Local AI | Ollama, `llama3.2:1b`, `nomic-embed-text`, local RAG service files |
| Client Config | Firebase SDK |
| Tooling | ESLint, Nodemon |

## Architecture

```text
client/                    React + Vite frontend
  src/
    api/                   Axios API client
    components/            Shared UI, chatbot widget, workflow UI components
    contexts/              Authentication context
    layouts/               Public and dashboard layouts
    pages/                 Public, auth, employee, manager, admin pages
    routes/                Protected route handling
    services/              Chatbot, approval, workflow API clients

server/                    Express API
  config/                  MongoDB connection
  controllers/             Auth, dashboard, requests, roles, users
  middleware/              Auth, role authorization, workflow checks
  models/                  User, requests, roles, audit, workflow models
  rag/                     Legacy local RAG knowledge base and helpers
  routes/                  REST API routes
  services/                Groq, Ollama, chatbot, workflow, routing, SLA, escalation
  utils/                   Audit and workflow helper utilities
```

## Project Structure

```text
Employee_Access_Mgt_System/
+-- client/
|   +-- src/
|   |   +-- api/
|   |   +-- components/
|   |   +-- contexts/
|   |   +-- layouts/
|   |   +-- pages/
|   |   +-- routes/
|   |   +-- services/
|   +-- package.json
|   +-- vite.config.js
+-- server/
|   +-- config/
|   +-- controllers/
|   +-- middleware/
|   +-- models/
|   +-- rag/
|   +-- routes/
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
- MongoDB Atlas database or local MongoDB instance
- Groq API key for the active chatbot route
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
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173

GROQ_API_KEY=your_groq_api_key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.1-8b-instant

# Optional legacy local AI settings
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

Do not commit real secrets, database credentials, JWT secrets, Firebase private keys, or production API keys. If a key is exposed, rotate it immediately.

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
| Requests | `/requests` | Access request submission, listing, review, revocation, approval status |
| Roles | `/roles` | Role template management |
| Audit | `/audit` | Admin audit log access |
| Notifications | `/notifications` | Role-aware dashboard notifications |
| Chatbot | `/chatbot` | Protected AI assistant |
| Admin Workflows | `/admin` | Workflow, layer, rule, assignment, SLA, escalation APIs |
| Approver Queue | `/approver` | Pending approvals, approval details, approval statistics |
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
| `GET` | `/api/approver/pending-approvals` | Pending workflow approvals |
| `GET` | `/api/approver/pending-approvals/:requestId/details` | Approval details and path |
| `PUT` | `/api/approvals/:requestId/approve` | Approve current workflow layer |
| `PUT` | `/api/approvals/:requestId/reject` | Reject current workflow layer |
| `POST` | `/api/approvals/:requestId/delegate` | Delegate approval authority |
| `POST` | `/api/approvals/:requestId/escalate` | Escalate approval |
| `POST` | `/api/chatbot/message` | Send chatbot message |
| `POST` | `/api/chatbot/ask` | Send direct chatbot prompt |

## Approval Workflow System

The newer workflow system is built around these models:

| Model | Purpose |
| --- | --- |
| `ApprovalWorkflow` | Top-level workflow definition and matching metadata |
| `ApprovalLayer` | One step/layer in a workflow |
| `ApprovalRule` | Conditional routing rule for workflow decisions |
| `ApprovalAssignment` | User assignment to approval layers with daily approval limits |
| `ApprovalHistory` | Append-only record of approval actions |
| `AccessRequest` | Request lifecycle plus workflow status/timeline fields |

### Workflow Behavior

1. Employee submits an access request.
2. The workflow engine evaluates applicable workflows by access type, department, risk level, and priority.
3. Matching workflows create layer statuses and approval routing.
4. Assigned approvers see pending items in `/api/approver/pending-approvals`.
5. Approvers approve, reject, delegate, or escalate.
6. Approval history is recorded for auditability.
7. Completed approval paths mark the access request approved.
8. SLA deadlines are monitored by the escalation service.

### Admin Workflow APIs

| Endpoint | Purpose |
| --- | --- |
| `/api/admin/workflows` | Create, list, update, delete workflows |
| `/api/admin/workflows/:workflowId/preview` | Preview workflow routing |
| `/api/admin/workflows/:workflowId/layers` | Manage workflow layers |
| `/api/admin/layers/:layerId/reorder` | Reorder layers |
| `/api/admin/workflows/:workflowId/rules` | Manage conditional rules |
| `/api/admin/rules/:ruleId/test` | Test a rule condition |
| `/api/admin/approval-assignments` | Assign approvers to layers |
| `/api/admin/users/:userId/assigned-layers` | View a user's layer assignments |
| `/api/admin/sla-metrics` | SLA summary metrics |
| `/api/admin/sla-report` | SLA report |
| `/api/admin/escalation-history` | Escalation history |
| `/api/admin/escalation/run` | Manually run escalation check |
| `/api/admin/approval-dashboard` | Approval dashboard summary |

The server starts an escalation cron automatically every 15 minutes. It checks pending requests whose SLA deadlines have passed and escalates them through `escalationService`.

## Chatbot Assistant

The mounted chatbot route currently uses `server/services/groqService.js`.

Endpoint:

```text
POST /api/chatbot/message
```

Request body:

```json
{
  "message": "How many employees are there?"
}
```

Response body:

```json
{
  "reply": "Final answer",
  "answer": "Final answer",
  "message": "Final answer"
}
```

The Groq configuration is:

```env
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.1-8b-instant
```

The previous `llama3-8b-8192` model is decommissioned and should not be used. If Render or a local `.env` still sets `GROQ_MODEL=llama3-8b-8192`, Groq returns a `400 model_decommissioned` error.

### Chatbot Limits

The app currently does not enforce its own daily chatbot prompt limit. Groq rate limits apply at the Groq organization/API-key level. For `llama-3.1-8b-instant`, current Groq limits have included request-per-minute, request-per-day, token-per-minute, and token-per-day caps. Check the Groq console/docs for the current limits before production use.

### Legacy Local RAG/Ollama Files

The repo still contains local AI/RAG files:

- `server/services/ollamaService.js`
- `server/services/chatbotService.js`
- `server/rag/ragService.js`
- `server/rag/knowledgeBase.js`

These are useful if you want to return to a local RAG flow with Ollama, embeddings, and a local knowledge base. The current mounted route imports `groqService`, so Ollama is optional unless you rewire the chatbot route.

Optional Ollama setup:

```bash
ollama pull llama3.2:1b
ollama pull nomic-embed-text
ollama serve
```

## User Roles

| Role | Access Scope |
| --- | --- |
| `employee` | Submit requests, view own requests/history/timeline, manage profile, use chatbot |
| `manager` | Review team requests, work assigned approval queue, approve/reject/delegate/escalate, view approval history |
| `admin` | Manage users, roles, workflows, approvals, audit logs, analytics, revocation, SLA/escalation data |

## Frontend Routes

| Route | Access |
| --- | --- |
| `/` | Public landing page |
| `/login` | Public login |
| `/register` | Public registration |
| `/about` | Public about page |
| `/support` | Public support page |
| `/dashboard` | Role-specific dashboard home |
| `/dashboard/profile` | All authenticated roles |
| `/dashboard/submit-request` | Employee |
| `/dashboard/my-requests` | Employee |
| `/dashboard/history` | Employee |
| `/dashboard/review-requests` | Manager |
| `/dashboard/team-requests` | Manager |
| `/dashboard/approval-history` | Manager |
| `/dashboard/approval-queue` | Admin |
| `/dashboard/manage-roles` | Admin |
| `/dashboard/manage-users` | Admin |
| `/dashboard/audit-logs` | Admin |
| `/dashboard/analytics` | Admin |
| `/dashboard/revoke-access` | Admin |

Some admin workflow management page files and services exist in `client/src/pages/admin` and `client/src/services/workflowService.js`; confirm routing in `client/src/App.jsx` before relying on a page in the live UI.

## Deployment Notes

### Render Backend

Set the backend environment variables directly in Render. Render environment variables override values from example files.

Important production values:

```env
NODE_ENV=production
MONGO_URI=your_production_mongodb_connection_string
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRE=7d
CLIENT_URL=https://sentinel-earms.netlify.app
GROQ_API_KEY=your_groq_api_key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.1-8b-instant
```

If logs show `getaddrinfo ENOTFOUND api.groq.ai`, Render still has an old `GROQ_API_URL`. Replace it with `https://api.groq.com/openai/v1/chat/completions` or remove it so the code fallback is used.

If logs show `model_decommissioned`, Render still has an old `GROQ_MODEL`. Replace it with `llama-3.1-8b-instant`.

### Netlify Frontend

Set:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api
```

Also configure any Firebase client variables needed by the deployed frontend.

## Security Notes

- Passwords are hashed with bcrypt before storage.
- JWT tokens are required for protected API routes.
- Authorization middleware restricts role-specific endpoints.
- Audit logs are created for important actions such as request submission, approval, rejection, delegation, escalation, role changes, profile updates, password changes, account changes, and access revocation.
- Approval history records are designed as append-only approval action records.
- Uploaded avatars are limited by file type and size.
- CORS is restricted by `CLIENT_URL`.
- Use strong production `JWT_SECRET` values.
- Rotate any exposed API key immediately.
- Never commit real `.env` files or secrets.

## Development Workflow

1. Create or update local environment files.
2. Start the server with `npm run dev` inside `server`.
3. Start the client with `npm run dev` inside `client`.
4. Use the frontend at `http://localhost:5173`.
5. Validate API availability through `/api/health`.
6. Run syntax checks for touched backend files when useful:

```bash
node -c server/services/groqService.js
node -c server/routes/chatbotRoutes.js
```

7. Run frontend linting before submitting UI changes:

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

Check backend logs for the real API error. Common causes are missing `GROQ_API_KEY`, wrong `GROQ_API_URL`, retired `GROQ_MODEL`, or Groq rate limits.

### Browser cannot reach the API

Confirm `VITE_API_URL` points to the backend `/api` base URL, and confirm backend `CLIENT_URL` matches the deployed frontend origin.

### Local login works but protected routes fail

Confirm the JWT secret is set, the token is stored by the client, and requests include:

```http
Authorization: Bearer <jwt_token>
```

### Uploads fail

Check file type, file size, and whether the server can write to the configured uploads directory in the deployment environment.

## Author

Made by Kazi Fabiha Golam Liya.
