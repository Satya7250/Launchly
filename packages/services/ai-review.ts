import { db, eq, and, desc, asc } from "@repo/database";
import {
  aiReviewsTable,
  aiReviewFindingsTable,
  aiReviewAuditsTable,
  pullRequestsTable,
} from "@repo/database/schema";
import { logger } from "@repo/logger";
import { randomUUID, createHash } from "node:crypto";

// ─── Typed service errors ─────────────────────────────────────────────────────

export class AIReviewError extends Error {
  constructor(
    public readonly code:
      | "PULL_REQUEST_NOT_FOUND"
      | "REVIEW_NOT_FOUND"
      | "REVIEW_PENDING_CONFLICT"
      | "REVIEW_PERSISTENCE_FAILED",
    message: string
  ) {
    super(message);
    this.name = "AIReviewError";
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Stable short hash for idempotency keys and prompt/response tracing. */
function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 64);
}

/** Build an idempotency key that is unique per (pullRequestId, version). */
function buildIdempotencyKey(pullRequestId: string, version: number): string {
  return `ai-review:${pullRequestId}:v${version}:${randomUUID()}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class AIReviewService {
  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Assert that the pull request exists and belongs to the given organization.
   * Throws PULL_REQUEST_NOT_FOUND on failure.
   */
  private async assertPullRequestOwnership(
    organizationId: string,
    pullRequestId: string
  ) {
    const [pr] = await db
      .select({ id: pullRequestsTable.id })
      .from(pullRequestsTable)
      .where(
        and(
          eq(pullRequestsTable.id, pullRequestId),
          eq(pullRequestsTable.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!pr) {
      throw new AIReviewError(
        "PULL_REQUEST_NOT_FOUND",
        `Pull request ${pullRequestId} not found in organization ${organizationId}`
      );
    }
  }

  /**
   * Resolve the next version number for a pull request review.
   * If no reviews exist yet, returns 1.
   */
  private async resolveNextVersion(
    organizationId: string,
    pullRequestId: string
  ): Promise<number> {
    const [latest] = await db
      .select({ version: aiReviewsTable.version })
      .from(aiReviewsTable)
      .where(
        and(
          eq(aiReviewsTable.pullRequestId, pullRequestId),
          eq(aiReviewsTable.organizationId, organizationId)
        )
      )
      .orderBy(desc(aiReviewsTable.version))
      .limit(1);

    return (latest?.version ?? 0) + 1;
  }

  /**
   * Check for an existing PENDING review on the pull request (workspace-scoped).
   * Throws REVIEW_PENDING_CONFLICT if one exists.
   */
  private async assertNoPendingReview(
    organizationId: string,
    pullRequestId: string
  ): Promise<void> {
    const [pending] = await db
      .select({ id: aiReviewsTable.id, version: aiReviewsTable.version })
      .from(aiReviewsTable)
      .where(
        and(
          eq(aiReviewsTable.pullRequestId, pullRequestId),
          eq(aiReviewsTable.organizationId, organizationId),
          eq(aiReviewsTable.status, "PENDING")
        )
      )
      .limit(1);

    if (pending) {
      throw new AIReviewError(
        "REVIEW_PENDING_CONFLICT",
        `A PENDING review (id=${pending.id}, version=${pending.version}) already exists for pull request ${pullRequestId}. ` +
          `Wait for it to complete or fail before creating a new one.`
      );
    }
  }

  /**
   * Insert a PENDING review row and its initial audit record atomically.
   * Returns the inserted review.
   */
  private async createPendingReview(
    organizationId: string,
    pullRequestId: string,
    version: number,
    idempotencyKey: string,
    promptHash: string
  ) {
    return db.transaction(async (tx) => {
      const [review] = await tx
        .insert(aiReviewsTable)
        .values({
          organizationId,
          pullRequestId,
          version,
          status: "PENDING",
          // Provider/model will be filled in once the AI job completes.
          // These placeholders keep NOT NULL constraints satisfied if they
          // existed, but our schema marks them nullable, so nothing is needed.
        })
        .returning();

      if (!review) {
        throw new AIReviewError(
          "REVIEW_PERSISTENCE_FAILED",
          "Failed to insert ai_reviews row"
        );
      }

      await tx.insert(aiReviewAuditsTable).values({
        reviewId: review.id,
        provider: "pending",   // filled in by the worker
        model: "pending",      // filled in by the worker
        promptVersion: "v1",
        idempotencyKey,
        promptHash,
        responseHash: null,
        tokenUsage: null,
        durationMs: null,
        retryCount: 0,
        status: "STARTED",
        error: null,
      });

      return review;
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * generateReview
   *
   * Creates a new PENDING AI review for a pull request.
   *
   * Business rules:
   * - Workspace isolation: pullRequestId must belong to organizationId.
   * - Idempotency: rejects with REVIEW_PENDING_CONFLICT (HTTP 409) if a
   *   PENDING review already exists.
   * - Versioning: the new row gets version = max(existing) + 1.
   * - Audit: an ai_review_audits row is created in the same transaction.
   *
   * The actual AI generation is performed asynchronously by an Inngest worker
   * (Milestone 3). This method only creates the PENDING row so the caller can
   * poll for status.
   */
  public async generateReview(organizationId: string, pullRequestId: string) {
    // 1. Verify workspace ownership
    await this.assertPullRequestOwnership(organizationId, pullRequestId);

    // 2. Idempotency guard – block duplicate PENDING reviews
    await this.assertNoPendingReview(organizationId, pullRequestId);

    // 3. Compute next version
    const version = await this.resolveNextVersion(organizationId, pullRequestId);

    // 4. Build idempotency artifacts
    const idempotencyKey = buildIdempotencyKey(pullRequestId, version);
    const promptHash = sha256(`${pullRequestId}:${version}`);

    // 5. Persist atomically
    const review = await this.createPendingReview(
      organizationId,
      pullRequestId,
      version,
      idempotencyKey,
      promptHash
    );

    logger.info(
      `[AIReview] generateReview: created review id=${review.id} version=${version} for PR ${pullRequestId}`,
      {
        event: "AI_REVIEW_GENERATED",
        organizationId,
        pullRequestId,
        reviewId: review.id,
        version,
        idempotencyKey,
      }
    );

    return review;
  }

  /**
   * regenerateReview
   *
   * Creates a NEW version review for a pull request that already has at least
   * one completed or failed review. Enforces the same idempotency guard as
   * generateReview — no duplicate PENDING reviews allowed.
   *
   * This is a thin alias over generateReview because the versioning logic is
   * identical; the distinction is purely semantic / API-level.
   */
  public async regenerateReview(organizationId: string, pullRequestId: string) {
    // 1. Verify workspace ownership
    await this.assertPullRequestOwnership(organizationId, pullRequestId);

    // 2. Idempotency guard
    await this.assertNoPendingReview(organizationId, pullRequestId);

    // 3. Next version
    const version = await this.resolveNextVersion(organizationId, pullRequestId);

    // 4. Idempotency artifacts
    const idempotencyKey = buildIdempotencyKey(pullRequestId, version);
    const promptHash = sha256(`${pullRequestId}:${version}`);

    // 5. Persist
    const review = await this.createPendingReview(
      organizationId,
      pullRequestId,
      version,
      idempotencyKey,
      promptHash
    );

    logger.info(
      `[AIReview] regenerateReview: created review id=${review.id} version=${version} for PR ${pullRequestId}`,
      {
        event: "AI_REVIEW_REGENERATED",
        organizationId,
        pullRequestId,
        reviewId: review.id,
        version,
        idempotencyKey,
      }
    );

    return review;
  }

  /**
   * listReviews
   *
   * Returns paginated reviews for a pull request, newest first.
   * Workspace-isolated: only reviews in `organizationId` are returned.
   */
  public async listReviews(
    organizationId: string,
    pullRequestId: string,
    page = 1,
    limit = 20
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const offset = (Math.max(page, 1) - 1) * safeLimit;

    const rows = await db
      .select()
      .from(aiReviewsTable)
      .where(
        and(
          eq(aiReviewsTable.pullRequestId, pullRequestId),
          eq(aiReviewsTable.organizationId, organizationId)
        )
      )
      .orderBy(desc(aiReviewsTable.version))
      .limit(safeLimit)
      .offset(offset);

    return rows;
  }

  /**
   * getReview
   *
   * Returns a single review by id, workspace-isolated.
   * Returns null if the review does not exist or belongs to a different org.
   */
  public async getReview(organizationId: string, reviewId: string) {
    const [review] = await db
      .select()
      .from(aiReviewsTable)
      .where(
        and(
          eq(aiReviewsTable.id, reviewId),
          eq(aiReviewsTable.organizationId, organizationId)
        )
      )
      .limit(1);

    return review ?? null;
  }

  /**
   * getLatestReview
   *
   * Convenience method: returns the highest-version review for a pull request.
   * Returns null if no reviews exist.
   */
  public async getLatestReview(organizationId: string, pullRequestId: string) {
    const [review] = await db
      .select()
      .from(aiReviewsTable)
      .where(
        and(
          eq(aiReviewsTable.pullRequestId, pullRequestId),
          eq(aiReviewsTable.organizationId, organizationId)
        )
      )
      .orderBy(desc(aiReviewsTable.version))
      .limit(1);

    return review ?? null;
  }

  /**
   * listFindings
   *
   * Returns all findings for a review, workspace-isolated via a join to
   * ai_reviews. Ordered by severity DESC then category ASC for consistent
   * presentation.
   */
  public async listFindings(organizationId: string, reviewId: string) {
    // Join back to ai_reviews to enforce workspace isolation — a finding only
    // exposes if the parent review belongs to this organization.
    const rows = await db
      .select({ finding: aiReviewFindingsTable })
      .from(aiReviewFindingsTable)
      .innerJoin(
        aiReviewsTable,
        eq(aiReviewFindingsTable.reviewId, aiReviewsTable.id)
      )
      .where(
        and(
          eq(aiReviewFindingsTable.reviewId, reviewId),
          eq(aiReviewsTable.organizationId, organizationId)
        )
      )
      .orderBy(
        asc(aiReviewFindingsTable.severity),   // CRITICAL < HIGH < MEDIUM < LOW < INFO (enum order)
        asc(aiReviewFindingsTable.category)
      );

    return rows.map((r) => r.finding);
  }

  /**
   * updateAuditRecord
   *
   * Called by the Inngest worker (Milestone 3) after generation completes or
   * fails. Updates the audit row and stamps the review with the final outcome.
   *
   * Exposed here so the worker does not need to perform raw DB queries.
   */
  public async updateAuditRecord(
    reviewId: string,
    organizationId: string,
    update: {
      provider: string;
      model: string;
      promptVersion: string;
      tokenUsage: Record<string, number> | null;
      durationMs: number;
      retryCount: number;
      responseHash: string | null;
      status: "COMPLETED" | "FAILED";
      error: string | null;
    }
  ) {
    // Workspace-isolation: confirm review ownership before mutating the audit
    const review = await this.getReview(organizationId, reviewId);
    if (!review) {
      throw new AIReviewError(
        "REVIEW_NOT_FOUND",
        `Review ${reviewId} not found in organization ${organizationId}`
      );
    }

    await db
      .update(aiReviewAuditsTable)
      .set({
        provider: update.provider,
        model: update.model,
        promptVersion: update.promptVersion,
        tokenUsage: update.tokenUsage,
        durationMs: update.durationMs,
        retryCount: update.retryCount,
        responseHash: update.responseHash,
        status: update.status,
        error: update.error,
      })
      .where(eq(aiReviewAuditsTable.reviewId, reviewId));

    logger.info(
      `[AIReview] updateAuditRecord: reviewId=${reviewId} status=${update.status}`,
      {
        event: "AI_REVIEW_AUDIT_UPDATED",
        organizationId,
        reviewId,
        status: update.status,
        durationMs: update.durationMs,
      }
    );
  }
}

export const aiReviewService = new AIReviewService();
