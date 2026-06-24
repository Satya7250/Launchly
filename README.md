# Launchly / ShipFlow AI

An enterprise-grade monorepo platform orchestrating clients' feature requests, automated PRD generation, task management, payment flows, and AI-driven pull request code reviews.

---

## Product Overview

Launchly helps product and software engineering teams bridge the gap between initial product ideas and high-quality, tenant-isolated production code. The complete end-to-end user journey is mapped as follows:

```
Feature Request 
      ↓
AI Clarification 
      ↓
PRD Generation 
      ↓
PRD Versioning 
      ↓
Engineering Task Generation (Hardened)
      ↓
Kanban Board (Optimistic Updates)
      ↓
GitHub Integration (Webhook Triggered)
      ↓
AI Review
      ↓
Human Approval
      ↓
Shipped
```

---

## Tech Stack

The application leverages a modern, highly observable typescript monorepo tech stack:
- **Core Frontend Framework:** Next.js (App Router, Tailwind CSS, and shadcn/ui components)
- **Application Server:** Express server (TypeScript, tRPC v11, and OpenAPI specifications)
- **Database:** PostgreSQL on Neon Serverless Postgres
- **ORM:** Drizzle ORM (schema definitions, relations, and migrations runner)
- **Authentication:** BetterAuth (OAuth 2.0 with Google, sessions management)
- **Background Event Bus:** Inngest SDK (reliable async queue, retry parameters, and concurrency controls)
- **AI Engine:** OpenAI SDK (structured JSON parsing, GPT-4o-mini, and a Mock fallback engine)
- **Kanban Board:** `@dnd-kit` (drag-and-drop sortable context engine)
- **Git Integration:** Octokit (GitHub Rest & App Auth wrapper)
- **Styling:** Tailwind CSS & Shadcn UI

---

## Monorepo Structure

Launchly separates deployment-ready applications from internal shared packages:

### Applications
- **`apps/api`**: The Express server hosting the backend, tRPC routers, background job endpoint listeners, and Scalar OpenAPI documentation.
- **`apps/web`**: The Next.js frontend application with dashboard routes, Spec editors, Pull Request tracker, and Kanban board views.

### Shared Packages
- **`packages/ai`**: Interface and schema definitions for prompt compilation and response parsing using OpenAI or a Mock provider.
- **`packages/auth`**: Centralized BetterAuth database adapter configuration and session rules.
- **`packages/billing`**: Razorpay gateway client interface and subscription webhook handlers.
- **`packages/database`**: PostgreSQL schema definitions, relations, index setup, and Drizzle migrations manager.
- **`packages/eslint-config`**: Shared ESLint Flat configuration rules.
- **`packages/github`**: GitHub App client configurations, webhook signature verification methods, and Octokit repository fetchers.
- **`packages/inngest`**: Centralized event schemas, background worker execution clients, and handler functions.
- **`packages/logger`**: Winston-based centralized logger utility.
- **`packages/services`**: Shared business logic helpers and database query service orchestrators.
- **`packages/shared`**: Common TS interfaces, Zod models, and environment variables validation schemas.
- **`packages/trpc`**: Centralized tRPC procedures, middlewares, context builders, and router mappings.
- **`packages/typescript-config`**: Shared compiler configuration bases (base.json, nextjs.json, node.json).
- **`packages/ui`**: *Planned for future package unification*. Currently, reusable UI components are colocated in `apps/web/components/ui` using shadcn/ui for UI components.

---

## GitHub Integration

Launchly provides a native GitHub integration module allowing organizations to link repositories, ingest PR files, and review code modifications.

### 1. GitHub App
The platform operates as a registered GitHub App. Organizations install the app on their individual user account or github organization. Authentication is managed using App IDs and PEM-encoded private keys, allowing Launchly to request short-lived installation access tokens dynamically.

### 2. Installation Flow
1. User is redirected to GitHub's App installation portal.
2. After granting permissions, GitHub redirects the user back to Launchly's settings page: `/github?installation_id=xxx`.
3. Launchly registers the `installationId` in the database under the active workspace's UUID, fetching account metadata asynchronously.

### 3. Repository Connection
Once installed, users choose from the list of available repositories fetched from GitHub and connect them to the workspace. This establishes a row in the `repositories` table scoped to the organization.

### 4. Webhook Processing & Idempotency
- GitHub fires webhooks to `/api/webhooks/github` on `pull_request` and `installation` events.
- **Signature Verification**: Every webhook payload must be signed using HMAC-SHA256 with the configured secret. The API parses and validates this signature.
- **Idempotency**: The server extracts the `X-GitHub-Delivery` header and checks the `github_webhook_deliveries` cache. Duplicate webhook requests are immediately skipped with `200 OK` to prevent processing events multiple times.
- **Auditing**: Every valid event is logged in `github_sync_audits` with a status of `RECEIVED`.
- **Fast Response**: To avoid GitHub's 10-second timeout, the webhook handler validates signatures, records delivery/audit logs, dispatches an Inngest background event, and immediately returns a `200 OK` response.

### 5. Inngest Background Jobs & PR Ingestion
The event is picked up by `githubPullRequestReceivedFunction`:
1. Transitions the audit log to `PROCESSING` status and updates the retry count.
2. Upserts a PR record in `pull_requests` with a processing lifecycle status of `RECEIVED` then `PROCESSING`.
3. Queries Octokit to fetch metadata (title, branches, commits, base/head SHAs) and file modifications.
4. Saves modified files into `pull_request_files`. To prevent database bloat, **patches for files larger than 20KB are ignored and stored as null**.
5. Transitions the PR processing status to `READY_FOR_AI_REVIEW`.
6. Updates the audit log to `COMPLETED` or `FAILED` (with error message), and sets the execution duration and final retry count.

### 6. Lazy Diff Loading
When displaying file diffs in the frontend, small file patches are loaded directly from `pull_request_files`. For files without stored patches (e.g. >20KB), the frontend triggers an on-demand tRPC query (`github.pullRequestDiff`) which fetches the raw patch from GitHub's API dynamically, reducing db load.

---

## Database Documentation

### Entity Relationship Diagram
```mermaid
erDiagram
    organizations ||--o{ github_installations : contains
    organizations ||--o{ github_sync_audits : records
    organizations ||--o{ repositories : includes
    organizations ||--o{ pull_requests : tracks
    organizations ||--o{ task_generation_audits : logs
    organizations ||--o{ engineering_tasks : tracks
    organizations ||--o{ ai_reviews : has
    organizations ||--o{ ai_review_audits : logs
    organizations ||--o{ release_approvals : tracks

    github_installations ||--o{ repositories : links
    repositories ||--o{ pull_requests : contains
    repositories ||--o{ github_sync_audits : logs
    pull_requests ||--o{ pull_request_files : modifies
    pull_requests ||--o{ github_sync_audits : logs
    pull_requests ||--o{ ai_reviews : reviewed
    pull_requests ||--o{ release_approvals : approvals
    ai_reviews ||--o{ ai_review_findings : has
    ai_reviews ||--o{ ai_review_audits : audited
    ai_reviews ||--o{ release_approvals : logs
    users ||--o{ release_approvals : decides
```

### Tables Reference

#### `organizations`
- **Purpose**: Defines tenant workspaces.
- **Columns**: `id` (UUID, PK), `name` (Varchar), `slug` (Varchar, Unique), `created_at` (Timestamp), `updated_at` (Timestamp).

#### `projects`
- **Purpose**: Groups related workspaces, specifications, and tasks.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK -> organizations), `name` (Varchar), `description` (Text), `created_at` (Timestamp), `updated_at` (Timestamp).

#### `feature_requests`
- **Purpose**: Tracks client requirements.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK), `project_id` (UUID, FK), `title` (Varchar), `description` (Text), `status` (Enum), `priority` (Enum).

#### `prds`
- **Purpose**: Product Requirement Documents representing parsed feature requests.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK), `feature_request_id` (UUID, FK), `problem_statement` (Text), `goals` (Text Array), `non_goals` (Text Array), `user_stories` (JSONB), `acceptance_criteria` (Text Array), `edge_cases` (Text Array), `success_metrics` (Text Array), `version` (Integer).
- **Versioning**: Each update creates a new PRD record or increments version trackers to preserve history.

#### `engineering_tasks`
- **Purpose**: Discrete developer task cards mapped to a PRD.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK), `prd_id` (UUID, FK), `project_id` (UUID, FK), `title` (Varchar), `description` (Text), `status` (Enum: `BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`), `position` (Integer), `version` (Integer), `metadata` (JSONB: AI estimations and complexity).

#### `task_generation_audits`
- **Purpose**: Immutable history of AI task breakdown runs.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK), `prd_id` (UUID, FK), `provider` (Varchar), `model` (Varchar), `prompt_hash` (Varchar), `response_hash` (Varchar), `temperature` (Real), `status` (Enum: `QUEUED`, `GENERATING`, `COMPLETED`, `FAILED`), `duration_ms` (Integer), `token_usage` (JSONB), `error` (Text).

#### `repositories`
- **Purpose**: Links connected GitHub repositories to active workspaces.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK -> organizations), `project_id` (UUID, FK -> projects, Nullable), `github_installation_id` (UUID, FK -> github_installations), `name` (Varchar), `full_name` (Varchar), `github_repo_id` (Bigint), `owner` (Varchar), `default_branch` (Varchar), `private` (Boolean), `installation_id` (Bigint).
- **Indexes**: `repositories_org_id_idx` on `organization_id`, unique constraint on `(organization_id, github_repo_id)`.

#### `pull_requests`
- **Purpose**: Code integrations synchronized from GitHub.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK -> organizations), `prd_id` (UUID, FK -> prds, Nullable), `repository_id` (UUID, FK -> repositories), `github_pr_id` (Bigint), `number` (Integer), `title` (Varchar), `branch` (Varchar), `base_branch` (Varchar), `head_sha` (Varchar), `base_sha` (Varchar), `state` (Varchar), `author` (Varchar), `url` (Varchar), `merged_at` (Timestamp), `status` (Enum: `OPEN`, `CHANGES_REQUESTED`, `APPROVED`, `MERGED`), `processing_status` (Enum: `RECEIVED`, `PROCESSING`, `READY_FOR_AI_REVIEW`, `FAILED`, `AI_REVIEWING`, `AI_REVIEW_COMPLETED`, `HUMAN_APPROVED`, `SHIPPED`).
- **Indexes**: `pull_requests_org_id_idx` on `organization_id`, unique constraint on `(organization_id, github_pr_id)`.

#### `pull_request_files`
- **Purpose**: Mapped list of changed files inside a PR.
- **Columns**: `id` (UUID, PK), `pull_request_id` (UUID, FK -> pull_requests), `filename` (Varchar), `status` (Varchar), `additions` (Integer), `deletions` (Integer), `changes` (Integer), `patch` (Text, Nullable).

#### `github_webhook_deliveries`
- **Purpose**: Logs GitHub delivery UUIDs to ensure event processing idempotency.
- **Columns**: `id` (Varchar, PK), `event_type` (Varchar), `processed_at` (Timestamp).

#### `github_sync_audits`
- **Purpose**: Immutable history of all GitHub webhook sync executions.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK -> organizations), `repository_id` (UUID, FK -> repositories, Nullable), `pull_request_id` (UUID, FK -> pull_requests, Nullable), `delivery_id` (Varchar), `event` (Varchar), `status` (Varchar: `RECEIVED`, `PROCESSING`, `COMPLETED`, `FAILED`), `started_at` (Timestamp), `completed_at` (Timestamp), `duration_ms` (Integer), `retry_count` (Integer), `error` (Varchar).
- **Indexes**: `github_sync_audits_org_id_idx` on `organization_id`, index on `delivery_id`.

#### `releases`
- **Purpose**: Tracks the lifecycle state of a release for a pull request. Updated atomically when shipped.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK → organizations), `pull_request_id` (UUID, FK → pull_requests, RESTRICT on delete), `version` (Varchar), `status` (Enum: `NOT_READY`, `READY_FOR_APPROVAL`, `APPROVED`, `SHIPPED`, `REJECTED`), `shipped_at` (Timestamp, nullable), `shipped_by` (UUID, FK → users, nullable), `release_version` (Varchar, nullable).
- **Indexes**: `releases_org_id_idx` on `organization_id`, `releases_pull_request_id_idx` on `pull_request_id`, `releases_status_idx` on `status`.

#### `release_approvals`
- **Purpose**: Immutable, append-only audit log of human approval decisions (request, approve, reject). Records are never updated or deleted. Ship events are stored in `release_ship_audits`.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK → organizations), `project_id` (UUID, FK → projects), `pull_request_id` (UUID, FK → pull_requests), `review_id` (UUID, FK → ai_reviews, nullable), `review_version` (Integer, nullable), `approved_by` (UUID, FK → users, nullable), `status` (Enum: `PENDING`, `APPROVED`, `REJECTED`), `comments` (Text, nullable), `created_at` (Timestamp), `updated_at` (Timestamp).
- **Indexes**: `release_approvals_org_id_idx` on `organization_id`, `release_approvals_pull_request_id_idx` on `pull_request_id`, `release_approvals_status_idx` on `status`.

#### `release_ship_audits`
- **Purpose**: Dedicated immutable audit log for release ship events. Semantically distinct from `release_approvals` (approval decisions). Every `shipRelease()` call inserts one row — never updated or deleted.
- **Columns**: `id` (UUID, PK), `organization_id` (UUID, FK → organizations), `release_id` (UUID, FK → releases, RESTRICT), `pull_request_id` (UUID, FK → pull_requests, RESTRICT), `shipped_by` (UUID, FK → users, nullable), `release_version` (Varchar, nullable), `notes` (Text, nullable), `shipped_at` (Timestamp).
- **Indexes**: `release_ship_audits_org_id_idx`, `release_ship_audits_release_id_idx`, `release_ship_audits_pull_request_id_idx`, `release_ship_audits_shipped_at_idx`.

---

## API Documentation (`github` Router)

All endpoints require workspace-level scoping and check authorization via the `workspaceProcedure` (injecting `ctx.workspace.active.id`).

### `connect`
- **Type**: `mutation`
- **Input**:
  ```typescript
  {
    installationId: number,
    githubRepositoryId: number,
    owner: string,
    name: string,
    defaultBranch: string,
    private: boolean,
    projectId?: string (UUID)
  }
  ```
- **Output**: Mapped database repository object.
- **Errors**: Throws `UNAUTHORIZED` if user is not in workspace, or standard database transaction errors.
- **Description**: Registers or links a repository to the workspace, automatically creating/updating the GitHub App installation record.

### `repositories`
- **Type**: `query`
- **Input**: `{ fetchAvailableForInstallationId?: number }`
- **Output**:
  ```typescript
  {
    connected: Repository[],
    available: AvailableRepo[],
    installations: Installation[]
  }
  ```
- **Description**: Lists connected workspace repositories and registers installations. If `fetchAvailableForInstallationId` is passed, fetches the latest list of accessible repositories from GitHub.

### `pullRequests`
- **Type**: `query`
- **Input**:
  ```typescript
  {
    page?: number,
    limit?: number,
    repositoryId?: string (UUID),
    processingStatus?: "RECEIVED" | "PROCESSING" | "READY_FOR_AI_REVIEW" | "FAILED"
  }
  ```
- **Output**:
  ```typescript
  {
    items: { pullRequest: PullRequest, repositoryName: string, repositoryFullName: string }[],
    pagination: { page: number, limit: number, totalCount: number, totalPages: number }
  }
  ```
- **Description**: Retrieves a paginated list of pull requests connected to the workspace.

### `pullRequestById`
- **Type**: `query`
- **Input**: `{ id: string (UUID) }`
- **Output**:
  ```typescript
  {
    pullRequest: PullRequest,
    repository: Repository,
    files: PullRequestFile[]
  }
  ```
- **Description**: Retrieves a single PR record, its parent repo, and its associated modified files list.

### `pullRequestDiff`
- **Type**: `query`
- **Input**: `{ id: string (UUID) }`
- **Output**: `{ diff: string }`
- **Description**: Returns the raw patch/diff text for the entire PR dynamically by querying Octokit. Used for displaying large diffs.

---

## Environment Variables

Ensure a `.env` file exists in the workspace root. Below are the required system parameters:

```ini
# Database Connection URL (PostgreSQL Neon Serverless)
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# AI Configuration
OPENAI_API_KEY=sk-proj-xxx
MOCK_AI=true # Set to true to bypass live OpenAI API calls and use Mock data generators

# Auth Configurations
BETTER_AUTH_SECRET=your_32_char_better_auth_secret
BETTER_AUTH_URL=http://localhost:8000

# GitHub App Configuration
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_hmac_secret

# Inngest Background Queue Configurations
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# AI Review Configuration
NEXT_PUBLIC_AI_REVIEW_POLL_MS=2000 # Polling interval in ms
```

---

## Sequence Diagrams

### 1. GitHub App Installation
```mermaid
sequenceDiagram
    autonumber
    actor User as Workspace Owner
    participant GH as GitHub Portal
    participant Web as apps/web (Frontend)
    participant API as apps/api (tRPC)
    participant DB as packages/database (Neon PG)

    User->>Web: Clicks "Install GitHub App"
    Web->>GH: Redirects to github.com/apps/your-app/installations/new
    User->>GH: Approves installation & scopes repo access
    GH-->>Web: Redirects back to /github?installation_id=123
    Web->>API: Query github.repositories({ fetchAvailableForInstallationId: 123 })
    API->>GH: Fetch Installation Details (Account Metadata)
    API->>DB: Upsert installation details into github_installations
    API-->>Web: Returns available repos and installations
    Web-->>User: Renders repository connection interface
```

### 2. Webhook Processing
```mermaid
sequenceDiagram
    autonumber
    participant GH as GitHub Events
    participant API as apps/api (Express Webhook)
    participant DB as packages/database (Neon PG)
    participant Inngest as Inngest Cloud

    GH->>API: POST /api/webhooks/github (Headers: signature, delivery-id, event)
    API->>API: Verify HMAC-SHA256 signature
    alt Signature Invalid
        API-->>GH: HTTP 401 Unauthorized
    else Signature Valid
        API->>DB: Query delivery_id in github_webhook_deliveries
        alt Delivery Exists (Duplicate)
            API-->>GH: HTTP 200 OK (Skip duplicate event)
        else Delivery New
            API->>DB: Save delivery_id
            API->>DB: Create github_sync_audits record (status: RECEIVED)
            API->>Inngest: Send event: github.pull_request.received (with auditId)
            API-->>GH: HTTP 200 OK (Fast Ack <100ms)
        end
    end
```

### 3. Pull Request Ingestion
```mermaid
sequenceDiagram
    autonumber
    participant Inngest as Inngest Runner
    participant DB as packages/database (Neon PG)
    participant GH_API as GitHub API (Octokit)

    Inngest->>DB: Update github_sync_audits (status: PROCESSING, retryCount: attempt)
    Inngest->>DB: Fetch Repository details (owner/name)
    Inngest->>DB: Upsert pull_requests record (processing_status: PROCESSING)
    Inngest->>GH_API: Fetch PR Details (branches, commits, state, base/head SHAs)
    Inngest->>GH_API: Fetch Changed Files (filename, additions, deletions, changes)
    Inngest->>DB: Update pull_requests with metadata
    rect rgb(20, 20, 30)
        Note over Inngest,DB: DB Transaction
        Inngest->>DB: Delete old pull_request_files records
        Inngest->>DB: Bulk insert new pull_request_files (patches >20KB stored as NULL)
    end
    Inngest->>DB: Update pull_requests (processing_status: READY_FOR_AI_REVIEW)
    Inngest->>DB: Update github_sync_audits (status: COMPLETED, durationMs)
    Inngest->>Inngest: Send completion event: github.pull_request.processed
```

### 4. Task Generation
```mermaid
sequenceDiagram
    autonumber
    actor User as Workspace Owner
    participant Web as apps/web (Kanban)
    participant API as apps/api (tRPC)
    participant DB as packages/database
    participant Inngest as Inngest Background
    participant AI as packages/ai (OpenAI / Mock)

    User->>Web: Clicks "Break Down Spec into Tasks"
    Web->>API: Mutation task.generate({ prdId })
    API->>DB: Lock PRD row (SELECT FOR UPDATE)
    API->>DB: Insert task_generation_audits record (status: QUEUED)
    API->>Inngest: Send event: task.generate (with generationId)
    API-->>Web: Returns { success: true, generationId }
    Note over Web,API: Web polls getGenerationStatus every 2s
    
    Inngest->>DB: Update audit status to GENERATING
    Inngest->>DB: Fetch PRD details
    Inngest->>AI: Call provider.generateTasks(prdObject)
    AI-->>Inngest: Returns task breakdown list & token usage
    Inngest->>DB: Bulk-insert tasks into engineering_tasks
    Inngest->>DB: Update audit record (status: COMPLETED, duration, hashes)
    
    Web->>API: Poll getGenerationStatus -> COMPLETED
    Web->>API: Query task.list({ prdId })
    API-->>Web: Returns task list array
    Web->>Web: Renders Kanban board
```

### 5. AI Review Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Workspace User
    participant Web as apps/web (Frontend)
    participant API as apps/api (tRPC)
    participant DB as packages/database (Neon PG)
    participant Inngest as Inngest Background
    participant AI as packages/ai (OpenAI / Mock)
    User->>Web: Clicks "Generate AI Review"
    Web->>API: Mutation review.generate({ pullRequestId })
    API->>DB: Check for existing pending review
    API->>DB: Insert pending review and audit
    API->>Inngest: Send event: pull_request.review.generate
    API-->>Web: Returns created review
    Note over Web,API: Web polls review.latest every 2s
    
    Inngest->>DB: Fetch PR, files, PRD, tasks
    Inngest->>AI: Call provider.reviewPullRequest(...)
    AI-->>Inngest: Returns review, findings, token usage
    Inngest->>DB: Update review, insert findings, update audit
    Inngest->>DB: Update PR status to AI_REVIEW_COMPLETED
    Inngest->>Inngest: Emit pull_request.review.completed
```

### 6. Complete Product Flow
```mermaid
graph TD
    FR[Feature Request Entered] -->|AI Scans Requirements| Clarify{Clarification Needed?}
    Clarify -->|Yes| ClarifyQuestions[AI Proposes Questions]
    ClarifyQuestions -->|User Answers| FR
    Clarify -->|No| PRD[Generate PRD spec]
    PRD -->|Save & Iterate| Versioning[PRD Versioning]
    Versioning -->|Trigger Task Breakdown| TaskGen[AI Task Breakdown]
    TaskGen -->|Render| Kanban[Kanban Boards]
    Kanban -->|Write Code & Push PR| Webhook[GitHub Webhook Received]
    Webhook -->|Verify Signature & Idempotency| Ingest[Fetch PR Metadata & Modified Files]
    Ingest -->|Save Files & Lazy Load Diff| PRDetail[Render PR detail & file diffs]
    PRDetail -->|Start Code Evaluation| AIReview[AI Code Review]
    AIReview -->|Review Score & Inline Suggestion| Human[Human Approval Gates]
    Human -->|Approve & Release| Ship[Shipped to Production]
```

---

## Production Readiness Features

- **Webhook Idempotency**: Double execution prevention by recording unique delivery IDs in Postgres.
- **Tenant Isolation**: Row-level organization checks enforced via `workspaceProcedure` on all routes.
- **Large Diff Handling**: Memory footprint reduction by storing only small patches (<20KB) in the database and loading larger patches on-demand.
- **Webhook Auditing**: Immutable audit trails log durations, statuses, retry attempts, and exceptions to ensure full pipeline visibility.
- **Human Approval Gate**: Releases cannot be shipped without explicit human approval. All approval decisions (request, approve, reject) are stored as immutable records in `release_approvals` — never overwritten.
- **Ship Audit Trail**: Every ship action inserts an immutable record in `release_ship_audits`, semantically separate from approval history. Ship events carry `shippedBy`, `releaseVersion`, `notes`, and `shippedAt`.
- **Atomic State Transitions**: Every release state change (release row + PR row + audit record) executes inside a single database transaction, preventing partial updates.
- **AI-Gated Approvals**: Releases with an incomplete AI review or unresolved `CRITICAL`/`HIGH` severity findings are blocked from approval at the server level, returning `428 PRECONDITION_FAILED`.
- **Complete Pipeline**: The full AI product delivery pipeline is now implemented: Feature Request → PRD → Engineering Tasks → GitHub PR → AI Review → Human Approval → SHIPPED.