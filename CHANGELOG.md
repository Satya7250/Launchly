# Changelog

All notable changes to the Launchly platform will be documented in this file.

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
