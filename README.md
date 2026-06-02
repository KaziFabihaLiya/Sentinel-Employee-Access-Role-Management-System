# Sentinel Employee Access Role Management System

Sentinel is a full-stack employee access role management system for requesting, reviewing, approving, auditing, and revoking enterprise application access. It provides role-based dashboards for employees, managers, and administrators, with secure authentication, request tracking, risk classification, and audit visibility.

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
- [Local RAG Chatbot](#local-rag-chatbot)
- [User Roles](#user-roles)
- [Security Notes](#security-notes)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

## Overview

The application centralizes access governance by allowing employees to submit access requests, managers to review department requests, and administrators to manage users, role templates, audit logs, analytics, and revocation workflows.

## Features

### Employee

- Register and log in with JWT-based authentication.
- Submit access requests with department, job title, requested role, justification, and access duration.
- View own request history and status updates.
- Manage profile details and avatar.

### Manager

- Review pending team access requests.
- Approve or reject requests with comments.
- View team request history and approval activity.

### Administrator

- Manage users, account status, and user roles.
- Create, update, and delete role templates.
- Revoke approved access.
- View audit logs and analytics dashboards.
- Track system activity across access lifecycle events.

### Platform

- Role-based protected routes.
- Password hashing with bcrypt.
- JWT authentication and authorization middleware.
- MongoDB persistence with Mongoose models.
- File upload support for profile avatars.
- Request risk classification based on role and duration.
- Local RAG-based AI chatbot powered by Ollama.
- Live database-aware chatbot answers for admin, manager, and employee scopes.
- REST API health check endpoint.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, React Router |
| API | Node.js, Express 5 |
| Database | MongoDB Atlas, Mongoose |
| Authentication | JWT, bcryptjs |
| HTTP Client | Axios |
| File Uploads | Multer |
| Local AI | Ollama, llama3.2:1b, nomic-embed-text |
| Retrieval | Local knowledge base, embeddings, cosine similarity |
| Client Config | Firebase SDK |
| Tooling | ESLint, Nodemon |

## Architecture

```text
client/                    React + Vite frontend
  src/
    pages/                 Role-specific UI pages
    layouts/               Public and dashboard layouts
    routes/                Protected route handling
    contexts/              Authentication context
    api/                   Axios API client
    services/              Workflow, approval, chatbot services
    components/            Shared and admin UI components

server/                    Express API
  config/                  Database connection
  controllers/             Request handlers
  middleware/              Authentication and authorization
  models/                  Mongoose schemas
  rag/                     Local RAG knowledge base and Ollama service
  routes/                  REST API routes
  utils/                   Audit helper utilities
```

## Project Structure

```text
Sentinel-Employee-Access-Role-Management-System/
+-- client/
|   +-- src/
|   +-- index.html
|   +-- package.json
|   +-- vite.config.js
+-- server/
|   +-- config/
|   +-- controllers/
|   +-- middleware/
|   +-- models/
|   +-- rag/
|   +-- routes/
|   +-- utils/
|   +-- server.js
|   +-- seed.js
|   +-- package.json
+-- package-lock.json
+-- README.md
```

## Getting Started

### Prerequisites

- Node.js 20 or newer recommended
- npm
- MongoDB Atlas database or local MongoDB instance
- Ollama installed and running locally
- Firebase project credentials if Firebase-backed client features are enabled

### Installation

Clone the repository and install dependencies for both applications:

```bash
git clone <repository-url>
cd Sentinel-Employee-Access-Role-Management-System

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

### Prepare Local AI Models

The chatbot uses Ollama locally. Pull the required models once:

```bash
ollama pull llama3.2:1b
ollama pull nomic-embed-text
```

If Ollama is not already running, start it:

```bash
ollama serve
```

If `ollama serve` reports that port `11434` is already in use, Ollama is already running.

## Environment Variables

Create `server/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_jwt_secret
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_GENERATION_MODEL=llama3.2:1b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

Create `client/.env` if Firebase configuration is required:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Do not commit real secrets, database credentials, or production keys.

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
| Auth | `/auth` | Register, login, current user, password changes |
| Dashboard | `/dashboard` | Dashboard metrics and summaries |
| Users | `/users` | Profile updates, user management, role assignment |
| Requests | `/requests` | Access request submission, review, revocation |
| Roles | `/roles` | Role template management |
| Audit | `/audit` | Audit log access |
| Notifications | `/notifications` | Notification-related operations |
| Chatbot | `/chatbot` | Protected local RAG assistant |

Most API routes require a bearer token:

```http
Authorization: Bearer <jwt_token>
```

## Local RAG Chatbot

The chatbot endpoint is:

```text
POST /api/chatbot/message
```

Request body:

```json
{
  "message": "How many total users are in Sentinel EARMS?"
}
```

Response body includes multiple compatible keys for frontend safety:

```json
{
  "reply": "Final answer",
  "answer": "Final answer",
  "message": "Final answer",
  "sources": [],
  "contextUsed": "Retrieved context"
}
```

The chatbot is fully local and does not use OpenAI, paid APIs, LangChain, Pinecone, Chroma, or cloud AI services.

### How Retrieval Works

1. The authenticated user sends a question to `/api/chatbot/message`.
2. The backend creates an embedding for the question using `nomic-embed-text`.
3. Static Sentinel EARMS knowledge chunks are embedded and compared with cosine similarity.
4. The top 3 relevant chunks are selected.
5. Live MongoDB metrics are added based on the authenticated user's role.
6. The final context is injected into a grounded prompt.
7. Ollama generates the answer using `llama3.2:1b`.

### Live Data Scope

| User Role | Chatbot Data Scope |
| --- | --- |
| `admin` | Organization-wide user, request, role template, risk, and audit metrics |
| `manager` | Department/team employee and request metrics |
| `employee` | Own access request metrics and general workflow guidance |

## User Roles

| Role | Access Scope |
| --- | --- |
| `employee` | Submit requests and view own request history |
| `manager` | Review department/team requests |
| `admin` | Manage users, roles, audit logs, analytics, and revocation |

## Security Notes

- Passwords are hashed with bcrypt before storage.
- JWT tokens are required for protected API routes.
- Authorization middleware restricts role-specific endpoints.
- Audit logs are created for important actions such as request submission, approval, role changes, profile updates, and access revocation.
- Uploaded avatars are limited by file type and size.
- Replace all development secrets before production deployment.

## Development Workflow

1. Create or update environment files locally.
2. Start the server with `npm run dev` inside `server`.
3. Start the client with `npm run dev` inside `client`.
4. Use the frontend at `http://localhost:5173`.
5. Validate API availability through `/api/health`.
6. Run linting before submitting changes:

```bash
cd client
npm run lint
```

## Author

```
Made by Kazi Fabiha Golam Liya. 
```
