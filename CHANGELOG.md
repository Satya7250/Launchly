# Changelog

All notable changes to the Launchly platform will be documented in this file.

---

## Phase 5: Human Approval & Release Workflow

Phase 5 introduces a comprehensive, human-in-the-loop release gate before pull requests can move to the `SHIPPED` status. It provides automated checklist compliance, transactional state validations, and a permanent, immutable audit history.

### New Features

#### Release Compliance Checklist
- **PRD Validation**: Verifies a PRD has been generated and linked to the Pull Request.
- **Task Generation Gate**: Confirms engineering tasks exist for the linked PRD.
- **AI Review Completion**: Checks if the latest AI review has been completed.
- **Blocking Finding Guard**: Scans for findings with `CRITICAL` or `HIGH` severity and prevents release approval if any blocking issues remain.

#### Release State Machine
- **State Flow**: Implements a strict release lifecycle: `NOT_READY` ➜ `READY_FOR_APPROVAL` ➜ `APPROVED` ➜ `SHIPPED` or ➜ `REJECTED`.
- **Server-Side Validation**: Enforces transition validations on the server; invalid transitions result in 409 Conflicts.
- **Transactional Atomicity**: All state updates (release status, pull request status, and approval records) execute atomically inside a single database transaction.

#### Immutable Audit Trail
- **Record Appending**: Every request, approval, and rejection appends a new entry to the `release_approvals` table.
- **Historical Visibility**: Prevents overwriting any approval rows to maintain a transparent, persistent log showing reviewers, comments, review versions, and timestamps.
- **Tenant Boundaries**: Enforces strict workspace isolation boundaries on all queries and mutations.

#### Frontend UI & Badges
- **Dedicated Release Approval page**: Allows developers to view checklist compliance status, request approval, approve or reject releases (requiring comments on rejection), and view the audit timeline.
- **Lifecycle Badge Updates**: Refines pull request badges on the PR list and details views to support `AI_REVIEWING`, `AI_REVIEW_COMPLETED`, `HUMAN_APPROVED`, and `SHIPPED` states.

---


## Phase 3: GitHub Integration & Pull Request Ingestion

Phase 3 implements a complete production-ready GitHub integration module enabling workspace owners to install the Launchly GitHub App, connect repositories, securely ingest pull requests via signature-verified webhooks, track modified files with lazy-loaded patches, and audit webhook execution pipelines.

### New Features

#### GitHub App Integration & Repository Connection
- **App Authentication**: Integrates `@octokit/rest` and `@octokit/auth-app` for App-level authorizations, managing dynamic installation access tokens.
- **Repository Linker**: Exposes query/mutation endpoints (`github.connect` and `github.repositories`) to fetch available repositories under an installation and register repository rows scoped to workspaces.

#### Webhook Ingest Pipeline & Security
- **HMAC Signature Validation**: Express JSON raw body capture parsed to verify GitHub's SHA-256 HMAC signature on incoming webhooks, rejecting invalid payloads.
- **Event Idempotency**: Registers webhook delivery UUIDs in `github_webhook_deliveries` to skip duplicate payloads with a fast response code.
- **Fast Responding**: The Express server verifies signatures, records events, schedules Inngest jobs, and responds in <100ms, staying well within GitHub's 10-second timeout.

#### Observable Auditing (`github_sync_audits`)
- **Lightweight Trace Logger**: Logs webhook executions into the `github_sync_audits` table (tracking status, timestamps, duration, retries, and errors) without overwriting historical execution records.
- **Retry Counters**: Resolves retry counts from Inngest execution context (`attempt`) to record accurate attempt counts in the database logs.

#### Pull Request lifecycle status machine
- **Lifecycle Enums**: Extends PR tracking statuses (`RECEIVED` ➜ `PROCESSING` ➜ `READY_FOR_AI_REVIEW` ➜ `FAILED`) and outlines future states (`AI_REVIEWING`, `AI_REVIEW_COMPLETED`, `HUMAN_APPROVED`, `SHIPPED`).
- **File ingestion & Cascade Safety**: Updates repository changes, deletes obsolete files records, and bulk-saves files on-demand inside database transaction scopes.

#### Performance Optimization & Lazy Loading
- **Patch Size Threshold**: Stifles database bloating by storing patches only for files <20KB. Larger diffs are stored as null.
- **On-Demand Diff Fetcher**: Implements the `github.pullRequestDiff` query to lazy-load large patches directly from GitHub when a user opens the PR details page.
- **Workspace Scoping**: Enforces tenant-isolation on every tRPC procedure using `workspaceProcedure` context checks.

---

## Phase 2: AI Task Generation & Kanban Board

Phase 2 focuses on bridging the specs defined in Product Requirement Documents (PRDs) with developer workflows by automating engineering task breakdowns and managing tasks visually on a Kanban board.

### New Features

#### AI Task Generation
- **Async Processing:** Connected task breakdowns to an asynchronous event loop driven by Inngest.
- **Idempotency Keys:** Enforced `idempotencyKey` checking in the background worker to skip processing on retries or duplicate runs, avoiding duplicate tasks.
- **AI Estimations & Metadata:** Persisted AI-generated estimates, complexity levels, dependencies, priority tags, and confidence scores inside a dedicated JSONB `metadata` column.
- **Mock & Live Modes:** Supported dynamic mock task breakdowns under `MockProvider` and OpenAI structured parsing under `OpenAIProvider`.

#### Kanban Board View
- **Multi-Column Boards:** Integrated a responsive board supporting five core developer columns: `Backlog`, `Todo`, `In Progress`, `Review`, and `Done`.
- **Positional Reordering:** Supported drag-and-drop movements to arrange priority order within columns.
- **Iteration Selector:** Provided dropdown version history control, allowing users to switch between task generations.

#### Task Generation Audit Trail
- **Immutable Log history:** Created the `task_generation_audits` table to keep complete records of all task generation attempts.
- **Observability parameters:** Persisted prompt and response SHA-256 hashes, execution durations, LLM token usages, model temperature parameter parameters, and exception logs.

#### Optimistic UI & Concurrency
- **Latency Compensation:** Immediate visual updates when dragging cards across columns or reordering list cards.
- **Automated Rollback:** Stores previous state snapshots and automatically reverts the UI cards to their prior positions if backend mutations fail.
- **Row-Level Transaction Safety:** Uses `SELECT FOR UPDATE` database locking on target PRDs inside `triggerTaskGeneration` to serialize concurrent requests and prevent duplicate runs.

#### Security & Tenant Scoping
- **Workspace Isolation:** Every endpoint utilizes the `workspaceProcedure` and queries filter by the workspace UUID (`organizationId`), preventing metadata leakage.
