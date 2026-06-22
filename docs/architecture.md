# Architecture Documentation

This document describes the codebase structure, dependency organization, data flows, and workflow integrations inside the Launchly monorepo.

---

## Monorepo Folder Structure

Launchly is organized into a modular workspace configuration powered by `pnpm` and `Turborepo`:

```
Launchly/
├── apps/
│   ├── api/             # Express API Server (tRPC + OpenAPI scalar docs)
│   └── web/             # Next.js Frontend Application
├── packages/
│   ├── ai/              # AI SDK & OpenAI models interface
│   ├── auth/            # BetterAuth identity provider
│   ├── billing/         # Payment gateways & Razorpay integrations
│   ├── database/        # Drizzle ORM definitions, schema migrations, and Neon connection client
│   ├── eslint-config/   # Linting configurations
│   ├── github/          # GitHub App webhook listeners and octokit interfaces
│   ├── inngest/         # Inngest SDK clients and event loop drivers
│   ├── logger/          # Winston-based centralized logger
│   ├── services/        # Application services & business logic orchestrators
│   ├── shared/          # Utility scripts and shared config schemas
│   ├── trpc/            # tRPC clients and backend server routers
│   └── typescript-config/# Shared TSConfigs (base.json, nextjs.json, node.json)
├── docs/                # Developer guides and system architecture documentations
├── package.json         # Workspace root configuration
└── turbo.json           # Turborepo task pipeline configuration
```

---

## Package Dependency Graph

```mermaid
graph TD
    apps_web["apps/web (Next.js)"]
    apps_api["apps/api (Express)"]

    pkg_trpc["packages/trpc"]
    pkg_services["packages/services"]
    pkg_auth["packages/auth"]
    pkg_database["packages/database"]
    pkg_logger["packages/logger"]
    pkg_inngest["packages/inngest"]
    pkg_ai["packages/ai"]
    pkg_github["packages/github"]
    pkg_billing["packages/billing"]
    pkg_shared["packages/shared"]

    apps_web --> pkg_trpc
    apps_web --> pkg_shared
    apps_api --> pkg_trpc
    apps_api --> pkg_auth
    apps_api --> pkg_logger
    apps_api --> pkg_shared

    pkg_trpc --> pkg_services
    pkg_auth --> pkg_database
    pkg_auth --> pkg_shared
    pkg_services --> pkg_database
    pkg_services --> pkg_logger
    pkg_services --> pkg_shared
    pkg_database --> pkg_shared
    pkg_logger --> pkg_shared
    pkg_inngest --> pkg_shared
    pkg_ai --> pkg_shared
    pkg_github --> pkg_shared
    pkg_billing --> pkg_shared
```

---

## Data Flows & Core Workflows

### 1. Authentication Flow (BetterAuth)

Launchly integrates BetterAuth to authorize clients. Users authenticate via credentials or Google OAuth:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as apps/web (Client)
    participant API as apps/api (Express Server)
    participant Auth as packages/auth (BetterAuth)
    participant DB as packages/database (Neon PG)

    User->>Web: Clicks "Sign in with Google"
    Web->>API: GET /api/trpc/auth.getSupportedAuthenticationProviders
    API-->>Web: Returns Google OAuth Callback Redirect URL
    Web->>User: Redirects to Google Login Consent
    User->>Web: Grants permission & returns with Auth Token
    Web->>API: POST /api/auth/* (BetterAuth Endpoint)
    API->>Auth: Validate OAuth payload
    Auth->>DB: Read/Create user record
    DB-->>Auth: User record created
    Auth-->>API: Sets cookies/session tokens
    API-->>Web: HTTP 200 (Authenticated session established)
```

---

### 2. AI Review Workflow

When code updates are pushed, Launchly automates review evaluation via the AI SDK:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant GH as GitHub App
    participant API as apps/api (Webhook Endpoint)
    participant Inngest as Inngest (Event Driver)
    participant AI as packages/ai (OpenAI SDK)
    participant DB as packages/database (Neon PG)

    Dev->>GH: Push commit / Create Pull Request
    GH->>API: Emit webhook event (pull_request.opened)
    API->>DB: Log new pull request record (status: OPEN)
    API->>Inngest: Send event: github/pull_request.created
    Inngest->>AI: Trigger review analysis task
    AI->>AI: Fetch code diff & run prompt engineering
    AI-->>Inngest: Return AI review score and suggestions
    Inngest->>DB: Log review record into ai_reviews & review_issues
    Inngest->>GH: Post feedback comment to GitHub PR
```

---

### 3. Subscription & Billing Flow

Launchly integrates Razorpay for tenant workspace subscription management:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Workspace Owner
    participant Web as apps/web
    participant API as apps/api
    participant RP as Razorpay API
    participant DB as packages/database

    Admin->>Web: Upgrades to Team/Pro tier
    Web->>API: Initialize Razorpay Subscription
    API->>RP: Create Subscription session
    RP-->>API: Returns Payment parameters
    API-->>Web: Render Razorpay Check-out iframe
    Admin->>Web: Inputs payment details
    Web->>RP: Direct Payment transaction processing
    RP-->>Web: Payment confirmation webhook
    RP->>API: POST /api/billing/webhook
    API->>DB: Update `subscriptions` record (plan: PRO, status: active)
    API-->>RP: HTTP 200 (Ack)
```

---

### 4. AI Task Generation Flow (Hardened)

Task breakdowns are processed asynchronously with strict idempotency and concurrency locks:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as apps/web (Kanban)
    participant API as apps/api (tRPC Router)
    participant TaskSvc as packages/services (TaskService)
    participant DB as packages/database (Neon PG)
    participant Inngest as Inngest (Event Bus)
    participant AI as packages/ai (OpenAI SDK)

    User->>Web: Clicks "Break Down Spec Into Tasks"
    Web->>API: Mutation task.generate({ prdId })
    API->>TaskSvc: triggerTaskGeneration(workspaceId, prdId)
    
    rect rgb(20, 20, 30)
        Note over TaskSvc,DB: Concurrency Protection Transaction
        TaskSvc->>DB: SELECT FOR UPDATE (Locks PRD row)
        TaskSvc->>DB: Check if any QUEUED/GENERATING audit exists
        TaskSvc->>DB: Insert new audit record (status: QUEUED, idempotencyKey)
    end
    
    TaskSvc->>Inngest: Send event: task.generate (with generationId)
    TaskSvc-->>API: Returns { success: true, generationId }
    API-->>Web: Returns response container
    
    Note over Web,API: Background Status Polling (refetchInterval: 2000ms)
    Web->>API: Query task.getGenerationStatus({ prdId })
    API-->>Web: Returns status: QUEUED

    Note over Inngest,AI: Inngest Asynchronous Execution Loop
    Inngest->>DB: Update status to GENERATING
    Inngest->>DB: Check idempotency (skip if already COMPLETED)
    Inngest->>DB: Fetch PRD details
    Inngest->>AI: Call provider.generateTasks(prdObject)
    AI-->>Inngest: Return task list array + usage metadata
    
    rect rgb(20, 20, 30)
        Note over Inngest,DB: DB Transaction
        Inngest->>DB: Insert tasks under nextVersion in engineering_tasks
    end
    
    Inngest->>DB: Update audit to COMPLETED (promptHash, responseHash, durationMs, temperature)
    
    Web->>API: Query task.getGenerationStatus({ prdId })
    API-->>Web: Returns status: COMPLETED
    Web->>API: Query task.list({ prdId, version })
    API-->>Web: Returns engineering task list
    Web->>User: Renders Kanban board with generated tasks
```

---

### 5. Background Job Loop (Inngest Workflow)

Background event loop scheduling is decoupled using Inngest event execution hooks:

```mermaid
graph LR
    subgraph Event Source
        web["apps/web"]
        api["apps/api"]
        github["GitHub Webhooks"]
    end

    subgraph Event Bus
        inngest["Inngest Cloud Bus"]
    end

    subgraph Event Handlers
        prd_job["Generate PRD Job"]
        review_job["Run AI Code Review Job"]
        billing_job["Sync Billing Plan Job"]
        task_job["Generate Tasks Job"]
    end

    web -->|Trigger Event| inngest
    api -->|Trigger Event| inngest
    github -->|Webhook Event| inngest

    inngest --> prd_job
    inngest --> review_job
    inngest --> billing_job
    inngest --> task_job
```

---

## TypeScript ESM Resolution Rules

Launchly utilizes modern Node.js and TypeScript configurations to ensure runtime ESM compatibility:
- **Module Settings**: `"module": "NodeNext"` and `"moduleResolution": "NodeNext"` are configured in `@repo/typescript-config/base.json`.
- **Package Configuration**: Workspace packages that define `"type": "module"` utilize ESM module resolution rules under Node.
- **Import Specifiers**: In alignment with Node.js ESM standards, relative imports within these packages must use explicit `.js` file extensions:
  - ❌ `import { env } from "./env"`
  - ✅ `import { env } from "./env.js"`
  *Note: TypeScript automatically resolves the `.js` path to the underlying `.ts` source files during type-checking and compilation while remaining compatible with standard Node.js runtimes.*

---

## Workspace & Tenant Isolation Flow
All data endpoints and background jobs inside Launchly strictly enforce organization-level scoping:
1. **API Requests:** Requests entering the tRPC engine utilize the `workspaceProcedure`. This middleware inspects the user's active session, validates that the user is a registered member of the organization, and mounts the validated workspace context on `ctx.workspace.active`.
2. **Services & Database:** All database operations inside the `TaskService` construct queries using the Drizzle `and()` operator, matching the query filters with the active workspace's UUID (`organizationId`).
3. **Background Jobs:** The `task.generate` event carries both the target `prdId` and the `workspaceId`. The Inngest runner queries the database with both fields, verifying that the PRD belongs to the requesting tenant workspace before triggering any LLM operations.
