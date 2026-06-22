# Launchly / ShipFlow AI

An enterprise-grade monorepo platform orchestrating clients' feature requests, automated PRD generation, task management, payment flows, and AI-driven pull request code reviews.

---

## Overview

Launchly (ShipFlow AI) helps product and software engineering teams bridge the gap between initial product specs and high-quality, tenant-isolated code output. The end-to-end user journey operates as follows:

```
Feature Request 
  ➜ AI Requirement Clarification 
  ➜ PRD Generation 
  ➜ PRD Versioning 
  ➜ AI Task Generation (Hardened) 
  ➜ Kanban Board (Optimistic Updates) 
  ➜ (Upcoming) GitHub PR Webhooks 
  ➜ AI Automated Code Review 
  ➜ Human Approval 
  ➜ Ship
```

---

## Tech Stack

The application leverages a cutting-edge typescript monorepo tech stack:
- **Monorepo Engine:** `pnpm` Workspaces + `Turborepo`
- **Application Server:** Express server (TypeScript, tRPC, OpenAPI specs)
- **Frontend App:** Next.js (App Router, Tailwind CSS, shadcn/ui components)
- **Database:** PostgreSQL on Neon Serverless Postgres
- **ORM:** Drizzle ORM (schema relations, migrations, type generation)
- **Authentication:** BetterAuth (OAuth 2.0 with Google, sessions management)
- **Background Event Bus:** Inngest SDK (reliable async queue, retry parameters)
- **AI Engine:** OpenAI SDK (GPT-4o-mini structured schemas, Mock fallback engine)
- **Kanban Board Engine:** `@dnd-kit` (drag-and-drop sortable contexts)
- **Billing & Subscriptions:** Razorpay SDK (webhooks synchronization)

---

## Architecture & Monorepo Structure

Launchly separates deployment-ready applications from internal shared packages:

### Applications
- `apps/api`: The Express server powering the backend, tRPC routers, and OpenAPI Scalar documentation page.
- `apps/web`: The Next.js frontend application with dashboard routes, Spec editors, and Kanban board views.

### Shared Packages
- `packages/ai`: OpenAI API client interface schemas and prompt configurations.
- `packages/auth`: Centralized BetterAuth database adapter configuration.
- `packages/billing`: Razorpay gateway client interface and payment webhook handlers.
- `packages/database`: PostgreSQL schema definitions, indices, and Drizzle migrations runner.
- `packages/eslint-config`: Shared ESLint Flat configuration rules.
- `packages/github`: Webhook listeners and Octokit integration clients.
- `packages/inngest`: Shared background execution clients and handlers setup.
- `packages/logger`: Winston-based centralized logger wrapper.
- `packages/services`: Consolidated business logic and ORM query orchestrators (e.g. `prdService`, `taskService`).
- `packages/shared`: Shared TS types, schema definitions, and env validators.
- `packages/trpc`: Centralized tRPC procedures, middle-wares, schemas, and router mappings.
- `packages/typescript-config`: Shared TSConfig bases.

### System Architecture Diagram

```mermaid
graph TD
    Web[apps/web] --> TRPC[packages/trpc]
    API[apps/api] --> TRPC
    TRPC --> Services[packages/services]
    Services --> DB[packages/database]
    Services --> Auth[packages/auth]
    Services --> AI[packages/ai]
    Services --> Inngest[packages/inngest]
```

---

## AI Features & Modes

1. **Requirement Clarification:** Detects underspecified specs and lists clarifying questions before PRD generation.
2. **PRD Generation:** Parses user descriptions into highly structured JSON formats (problem statement, goals, non-goals, user stories, acceptance criteria, edge cases).
3. **PRD Versioning:** Saves complete document versions for iteration management.
4. **AI Task Generation:** Scans the generated PRD content to outline discrete, dependency-mapped engineering tasks.
5. **Task Generation Audit Trail:** Tracks all generation metadata (provider, model, token usage, duration, prompt/response hashes).
6. **Provider Modes:**
   - **OpenAI Mode:** Live API completions mapping schemas with `zodResponseFormat`.
   - **Mock Mode:** Dynamic mock-data generator triggered if `MOCK_AI=true` or API keys are missing.

---

## Background Jobs & Inngest Event Loop

Launchly handles long-running AI breakdowns asynchronously to maintain quick client interactions.

- **Event Triggering:** The `task.generate` event is dispatched with `generationId`, `prdId`, `workspaceId`, and `projectId`.
- **Generation Lifecycle:** The job transitions through state machines:
  `NOT_STARTED` ➜ `QUEUED` (audit record inserted) ➜ `GENERATING` (worker active) ➜ `COMPLETED` (tasks saved) or `FAILED` (error logged).
- **Idempotency checks:** If Inngest retries the job (or receives the same event again), the worker detects the `COMPLETED` audit status for that `generationId` and immediately returns the count/version without duplicating tasks.
- **Audit Logging:** Saves executing durations, token consumptions, temperature parameters, and prompt/response SHA-256 hashes.

---

## Workspace & Tenant Isolation

Launchly is a secure multi-tenant SaaS application:
- **`workspaceProcedure`:** Every tRPC request validates that the authenticated user is an active member of the workspace. Context is injected on `ctx.workspace.active.id`.
- **Organization Scoping:** Every database query in the services layer uses Drizzle `and()` conditions to lock filters to `organizationId`.
- **AI Data Leak Protection:** Audits, tasks, and PRD metadata are strictly partitioned. The Inngest runner validates that the PRD belongs to the requested workspace before starting the job.

---

## Database Schema

```mermaid
erDiagram
    organizations ||--o{ prds : has
    organizations ||--o{ engineering_tasks : tracks
    organizations ||--o{ task_generation_audits : records
    prds ||--o{ engineering_tasks : contains
    prds ||--o{ task_generation_audits : logs
```

### Key Tables
- `projects`: Groups repositories and workspaces.
- `feature_requests`: Stores user specifications and tracking priority statuses.
- `prds`: Stores AI-generated PRDs (revision tracked).
- `engineering_tasks`: Stores developer tasks (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with estimate and priority metadata.
- `task_generation_audits`: Immutably logs execution attempts (hashes, duration, tokens, error logs).

*Detailed column definitions are cataloged in [Database Documentation](file:///d:/Launchly/docs/database.md).*

---

## Environment Variables

Create a `.env` file at the root. Use the provided `.env.example` as a template:

```ini
# Server Configuration
PORT=8000
NODE_ENV=development
BASE_URL=http://localhost:8000

# Web Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/trpc

# Database
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# Auth Configuration
BETTER_AUTH_SECRET=placeholder_secret
BETTER_AUTH_URL=http://localhost:8000
GOOGLE_CLIENT_ID=google_client_id
GOOGLE_CLIENT_SECRET=google_client_secret

# AI Configuration
OPENAI_API_KEY=openai_api_key
MOCK_AI=true # Set to true to bypass OpenAI APIs and use MockProvider

# GitHub Configuration (For Pull Request Reviews)
GITHUB_APP_ID=github_app_id
GITHUB_PRIVATE_KEY=github_private_key
GITHUB_WEBHOOK_SECRET=github_webhook_secret

# Billing
RAZORPAY_KEY_ID=razorpay_key_id
RAZORPAY_KEY_SECRET=razorpay_key_secret

# Inngest
INNGEST_EVENT_KEY=inngest_event_key
INNGEST_SIGNING_KEY=inngest_signing_key
```

---

## Setup Guide

Follow these sequential steps to run Launchly locally:

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```
2. **Generate Database Migrations:**
   ```bash
   pnpm db:generate
   ```
3. **Apply Database Migrations:**
   ```bash
   pnpm db:migrate
   ```
4. **Start Inngest Dev Server:**
   ```bash
   npx inngest-cli@latest dev
   ```
5. **Start Dev Servers (API & Next.js):**
   ```bash
   pnpm dev
   ```
6. **Verify Type-Checking:**
   ```bash
   pnpm check-types
   ```
7. **Compile Workspace Production Build:**
   ```bash
   pnpm build
   ```

---

## API Documentation (`task` Router)

All endpoints utilize `workspaceProcedure` and enforce workspace checks.

### Mutations
- `generate(input: { prdId: string }) ➜ { success: boolean, generationId: string }`
  Triggers async task generation; throws a `CONFLICT` error if an active generation is running.
- `updateStatus(input: { taskId: string, status: TaskStatus }) ➜ taskObject`
  Drags a task card's workflow state.
- `updatePosition(input: { taskId: string, position: number }) ➜ taskObject`
  Updates a task card's display position in a column.
- `delete(input: { taskId: string }) ➜ taskObject`
  Deletes a task card from the board.

### Queries
- `list(input: { prdId: string, version?: number }) ➜ taskObject[]`
  Retrieves tasks for a version iteration (defaults to latest).
- `listVersions(input: { prdId: string }) ➜ number[]`
  Lists generated task version numbers.
- `getGenerationStatus(input: { prdId: string }) ➜ statusObject`
  Checks status (`NOT_STARTED`, `QUEUED`, `GENERATING`, `COMPLETED`, `FAILED`) and errors.
- `getGenerationHistory(input: { prdId: string }) ➜ auditObject[]`
  Fetches full immutable generation attempts.

---

## AI Task Generation Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    User->>apps/web: Click Generate Tasks
    apps/web->>apps/api (tRPC): Mutation task.generate
    apps/api (tRPC)->>packages/services (TaskService): triggerTaskGeneration
    packages/services (TaskService)->>packages/database: Row lock SELECT FOR UPDATE
    packages/services (TaskService)->>packages/database: Insert QUEUED audit record
    packages/services (TaskService)->>packages/inngest: Dispatch task.generate event
    packages/inngest (Worker)->>packages/database: Verify and check idempotency key
    packages/inngest (Worker)->>packages/database: Update status to GENERATING
    packages/inngest (Worker)->>packages/ai: Call provider.generateTasks(prd)
    packages/ai->>packages/inngest (Worker): Return JSON task list
    packages/inngest (Worker)->>packages/database: Insert tasks in transaction (nextVersion)
    packages/inngest (Worker)->>packages/database: Update audit record (status: COMPLETED)
    apps/web->>apps/api (tRPC): Query getGenerationStatus (Poll)
    apps/api (tRPC)->>apps/web: Status updated to COMPLETED
    apps/web->>apps/web: Render Kanban board
```

---

## Production Readiness Features

- **Optimistic Updates:** Immediate Kanban board adjustments with zero UI delay. Automatically rolls back to prior state if background mutations fail.
- **Generation status polling:** Reactive UI state mapping. Automatically poll on active runs and suspend requests immediately on complete/fail.
- **Audit Logging & Retry:** Immutably persist errors. Retry trigger preserves historical logs by creating new records, keeping audit histories clean.

---

## Known Limitations

- **GitHub Integrations:** Pull request event handlers and comments are scheduled for the next development phase.
- **AI Review Loop:** Code evaluation and line-level code suggestions are pending GitHub auth integrations.
- **Human Approval:** Feature gates to approve releases manually are in draft status.
- **Test Infrastructure:** Unit tests and CI assertions are pending framework installations.