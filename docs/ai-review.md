# AI Review Documentation

This document covers the AI-driven pull request review functionality, including the database schema, services, tRPC router, inngest worker, and frontend components.

## Overview

The AI Review system analyzes pull requests to provide:
- Overall score and category scores (PRD alignment, task coverage, security, performance, architecture)
- Executive summary and recommendation
- Grouped findings (by severity: critical, high, medium, low, info)
- Immutable version history
- Complete audit trail

---

## Database Schema

### `ai_reviews`
Stores AI review records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organization_id` | UUID | Workspace isolation |
| `pull_request_id` | UUID | Foreign key to pull_requests |
| `version` | INT | Review version |
| `status` | ENUM | PENDING, COMPLETED, FAILED |
| `overall_score` | REAL | 0-100 |
| `prd_score` | REAL | 0-100 |
| `task_coverage_score` | REAL | 0-100 |
| `security_score` | REAL | 0-100 |
| `performance_score` | REAL | 0-100 |
| `architecture_score` | REAL | 0-100 |
| `summary` | TEXT | Executive summary |
| `recommendation` | ENUM | APPROVE, REQUEST_CHANGES, COMMENT |
| `provider` | VARCHAR | AI provider (openai, mock) |
| `model` | VARCHAR | Model used |
| `prompt_version` | VARCHAR | Prompt version |
| `metadata` | JSONB | Arbitrary metadata |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Update time |

**Indexes**:
- `ai_reviews_org_id_idx`
- `ai_reviews_pull_request_id_idx`
- `ai_reviews_status_idx`
- `ai_reviews_version_idx`
- Unique index `ai_reviews_pull_request_id_version_uidx` (PR, version)

---

### `ai_review_findings`
Stores individual issues and suggestions found during a review.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `review_id` | UUID | Foreign key to ai_reviews |
| `severity` | ENUM | CRITICAL, HIGH, MEDIUM, LOW, INFO |
| `category` | ENUM | SECURITY, PERFORMANCE, ARCHITECTURE, CORRECTNESS, STYLE, DOCUMENTATION, TEST_COVERAGE, OTHER |
| `title` | VARCHAR | Finding title |
| `description` | TEXT | Detailed description |
| `suggestion` | TEXT | Suggested fix |
| `file_path` | VARCHAR | Path to affected file |
| `line_start` | INT | Start line number |
| `line_end` | INT | End line number |
| `metadata` | JSONB | Arbitrary metadata |
| `created_at` | TIMESTAMP | Creation time |

**Indexes**:
- `ai_review_findings_review_id_idx`
- `ai_review_findings_severity_idx`
- `ai_review_findings_category_idx`

---

### `ai_review_audits`
Immutable audit trail of AI review runs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `review_id` | UUID | Foreign key to ai_reviews (nullable) |
| `provider` | VARCHAR | AI provider |
| `model` | VARCHAR | Model used |
| `prompt_version` | VARCHAR | Prompt version |
| `idempotency_key` | VARCHAR | Idempotency key |
| `prompt_hash` | VARCHAR | SHA-256 of prompt |
| `response_hash` | VARCHAR | SHA-256 of response |
| `token_usage` | JSONB | Token usage |
| `duration_ms` | INT | Run duration |
| `retry_count` | INT | Number of retries |
| `status` | VARCHAR | STARTED, COMPLETED, FAILED |
| `error` | TEXT | Error message if failed |
| `created_at` | TIMESTAMP | Creation time |

**Indexes**:
- `ai_review_audits_review_id_idx`
- `ai_review_audits_idempotency_idx`
- `ai_review_audits_status_idx`
- `ai_review_audits_provider_idx`

---

## Services

### `AIReviewService`

Located in `packages/services/ai-review.ts`

**Methods**:
- `generateReview`: Creates new pending review
- `regenerateReview`: Creates new version
- `listReviews`: Paginated list for PR
- `getReview`: Single review by ID
- `getLatestReview`: Latest review for PR
- `listFindings`: Findings for review
- `updateAuditRecord`: Updates audit record

---

## tRPC Router

Located in `packages/trpc/server/routes/review/route.ts`

**Procedures**:

### `generate`
- **Type**: Mutation
- **Input**: `{ pullRequestId: UUID }`
- **Output**: Created review
- **Error**: `CONFLICT` if pending exists

### `regenerate`
- **Type**: Mutation
- **Input**: `{ pullRequestId: UUID }`
- **Output**: Created review
- **Error**: `CONFLICT` if pending exists

### `list`
- **Type**: Query
- **Input**: `{ pullRequestId: UUID, page?: number, limit?: number }`
- **Output**: Paginated list

### `byId`
- **Type**: Query
- **Input**: `{ id: UUID }`
- **Output**: Single review

### `latest`
- **Type**: Query
- **Input**: `{ pullRequestId: UUID }`
- **Output**: Latest review (used for polling)

### `findings`
- **Type**: Query
- **Input**: `{ reviewId: UUID }`
- **Output**: Findings for review

---

## Inngest Functions

Located in `packages/inngest/functions.ts`

### `pullRequestReviewGenerateFunction`
- **Trigger**: `pull_request.review.generate`
- **Retries**: 2
- **Steps**:
  1. Load review
  2. Check idempotency
  3. Fetch PR, files, PRD, tasks
  4. Call AI provider
  5. Persist results, findings, audit
  6. Emit completion event

### `pullRequestReviewFailureFunction`
- **Trigger**: `inngest/function.failed` (for review function)
- **Steps**:
  1. Mark review FAILED
  2. Update audit record
  3. Emit failed event

---

## Frontend Components

Located in `apps/web/components/ai-review/`

### Files:
- `ReviewOverview.tsx`: Main component orchestrating everything
- `ReviewScoreCards.tsx`: Displays scores with ring progress
- `ReviewSummary.tsx`: Displays summary and recommendation
- `ReviewRecommendationBadge.tsx`: Badge for recommendation
- `ReviewFindingsList.tsx`: Collapsible findings grouped by severity
- `ReviewVersionSelector.tsx`: Version dropdown
- `ReviewLoadingState.tsx`: Skeleton loader
- `ReviewEmptyState.tsx`: Empty state with generate button
- `ReviewErrorState.tsx`: Error state with retry button

---

## Environment Variables

Add these to your `.env` file:

```ini
# AI Review
NEXT_PUBLIC_AI_REVIEW_POLL_MS=2000
```
