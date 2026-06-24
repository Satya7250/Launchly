# Changelog

All notable changes to the Launchly platform will be documented in this file.

---

## Phase 6: Ship Workflow — Complete AI Product Delivery Pipeline

Phase 6 implements the final "Ship" workflow, completing the end-to-end Launchly product delivery pipeline:

```
Feature Request → PRD → Engineering Tasks → GitHub PR → AI Review → Human Approval → SHIPPED
```

### New Features

#### Database: Additive Schema Changes
- **`releases` table** — Three new nullable columns added via additive migration (`0012_ship_release_fields.sql`):
  - `shipped_at` (timestamp) — Captures when the release was shipped
  - `shipped_by` (uuid, FK → users) — Captures the user who triggered the ship action
  - `release_version` (varchar 100) — Optional human-readable release version tag (e.g. `v1.2.3`)
- **`release_ship_audits` table** — New dedicated immutable audit table for ship events:
  - Semantically separate from `release_approvals` (human approval decisions)
  - Every `shipRelease()` call inserts one immutable row; rows are never updated or deleted
  - Columns: `organization_id`, `release_id`, `pull_request_id`, `shipped_by`, `release_version`, `notes`, `shipped_at`
  - Four indexes for efficient querying

#### Service Layer: `ShipService`
- **`packages/services/ship-service.ts`** — New `ShipService` with three methods:
  - `shipRelease({ userId, organizationId, pullRequestId, releaseVersion?, notes? })` — Atomic transactional ship with 6-step state machine
  - `getShipStatus(organizationId, pullRequestId)` — Returns current ship metadata
  - `getShipHistory(organizationId, pullRequestId)` — Returns immutable ship audit log
- **State Transition Validation**: Only `APPROVED` releases can be shipped. Any other status throws `INVALID_TRANSITION` (HTTP 409)
- **Atomic Transaction**: All 6 mutations execute in a single DB transaction — release update, PR processingStatus update, and ship audit insert
- **Workspace Isolation**: All queries include `organizationId` scope checks

#### tRPC: `shipRouter`
- **`packages/trpc/server/routes/ship/route.ts`** — New `shipRouter` with:
  - `ship.status` (query) — Fetch ship status and metadata
  - `ship.history` (query) — Fetch immutable ship audit history
  - `ship.ship` (mutation) — Ship an APPROVED release
- All procedures use `workspaceProcedure` for workspace isolation
- Error mapping: `INVALID_TRANSITION` → 409, `NOT_FOUND` → 404, else → 500

#### Frontend: Ship Page & PR Button
- **`apps/web/app/(dashboard)/github/pull-requests/[id]/ship/page.tsx`** — New Ship Release page:
  - Release Summary panel (PRD, Tasks, AI Review, Human Approval, version, shipped metadata)
  - Sticky Ship Panel with optional Release Version input and Release Notes textarea
  - Confirmation dialog: "Are you sure you want to mark this release as SHIPPED?"
  - Post-ship success banner showing `shippedBy`, `shippedAt`, `releaseVersion`
  - Immutable Ship Audit Trail timeline
  - Locked state for non-APPROVED releases
- **`apps/web/app/(dashboard)/github/pull-requests/[id]/page.tsx`** — PR detail page updated:
  - Added **"Ship Release"** button (purple, with Rocket icon)
  - Button enabled only when `releaseStatus === "APPROVED"`
  - Navigates to `/github/pull-requests/[id]/ship`

#### Documentation
- `docs/architecture.md` — Updated section 5 to document the full pipeline, state machine, and dual audit trail
- `docs/database.md` — Added `releases` ship columns, `release_ship_audits` table documentation, updated ER diagram
- `docs/api.md` — Added complete `ship` router documentation (status, history, ship endpoints)
- `README.md` — Updated database reference, added ship audit to production readiness section
- `CHANGELOG.md` — This entry

### Architecture Decisions

- **Audit Separation**: `release_approvals` records human approval decisions only. `release_ship_audits` records deployment events only. The two tables are never mixed — this preserves semantic correctness and simplifies independent querying.
- **Additive Only**: Migration `0012` adds columns and a table. No DROP, no ALTER existing constraints, no data modifications.
- **Immutability**: Ship audit rows are INSERT-only. No UPDATE or DELETE is performed anywhere in `ShipService`.

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
