import { db, eq, and, desc } from "@repo/database";
import {
  releasesTable,
  pullRequestsTable,
  releaseShipAuditsTable,
} from "@repo/database/schema";
import { logger } from "@repo/logger";

// ─── Error ────────────────────────────────────────────────────────────────────

export class ShipServiceError extends Error {
  constructor(
    public readonly code:
      | "PULL_REQUEST_NOT_FOUND"
      | "RELEASE_NOT_FOUND"
      | "INVALID_TRANSITION",
    message: string
  ) {
    super(message);
    this.name = "ShipServiceError";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShipReleaseInput {
  userId: string;
  organizationId: string;
  pullRequestId: string;
  /** Optional human-readable release version tag, e.g. "v1.2.3" */
  releaseVersion?: string;
  /** Optional release notes captured at ship time */
  notes?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ShipService {
  /**
   * Asserts workspace ownership of a pull request.
   * Used outside transactions for read-only checks.
   */
  private async assertPullRequest(organizationId: string, pullRequestId: string) {
    const [pr] = await db
      .select()
      .from(pullRequestsTable)
      .where(
        and(
          eq(pullRequestsTable.id, pullRequestId),
          eq(pullRequestsTable.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!pr) {
      throw new ShipServiceError(
        "PULL_REQUEST_NOT_FOUND",
        `Pull request ${pullRequestId} not found in workspace ${organizationId}`
      );
    }
    return pr;
  }

  /**
   * Ships an APPROVED release.
   *
   * Validates that the release is in APPROVED state, then inside a single
   * database transaction:
   *   1. Updates release.status → SHIPPED
   *   2. Sets release.shippedAt, release.shippedBy, release.releaseVersion
   *   3. Updates pull_request.processingStatus → SHIPPED
   *   4. Inserts an immutable record in release_ship_audits
   *
   * Only APPROVED releases can be shipped. Any other current status causes
   * an INVALID_TRANSITION error (HTTP 409).
   */
  public async shipRelease({
    userId,
    organizationId,
    pullRequestId,
    releaseVersion,
    notes,
  }: ShipReleaseInput) {
    return db.transaction(async (tx) => {
      // ── 1. Validate PR ownership ───────────────────────────────────────────
      const [pr] = await tx
        .select()
        .from(pullRequestsTable)
        .where(
          and(
            eq(pullRequestsTable.id, pullRequestId),
            eq(pullRequestsTable.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!pr) {
        throw new ShipServiceError(
          "PULL_REQUEST_NOT_FOUND",
          `Pull request ${pullRequestId} not found in workspace ${organizationId}`
        );
      }

      // ── 2. Fetch release record ────────────────────────────────────────────
      const [release] = await tx
        .select()
        .from(releasesTable)
        .where(
          and(
            eq(releasesTable.pullRequestId, pullRequestId),
            eq(releasesTable.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!release) {
        throw new ShipServiceError(
          "RELEASE_NOT_FOUND",
          `No release record found for pull request ${pullRequestId}`
        );
      }

      // ── 3. Validate state transition ──────────────────────────────────────
      // Only APPROVED releases may transition to SHIPPED.
      if (release.status !== "APPROVED") {
        throw new ShipServiceError(
          "INVALID_TRANSITION",
          `Cannot ship release when status is ${release.status}. Only APPROVED releases can be shipped.`
        );
      }

      const now = new Date();

      // ── 4. Update release → SHIPPED ───────────────────────────────────────
      await tx
        .update(releasesTable)
        .set({
          status: "SHIPPED",
          shippedAt: now,
          shippedBy: userId,
          releaseVersion: releaseVersion ?? null,
          updatedAt: now,
        })
        .where(eq(releasesTable.id, release.id));

      // ── 5. Update PR processingStatus → SHIPPED ───────────────────────────
      await tx
        .update(pullRequestsTable)
        .set({
          processingStatus: "SHIPPED",
          updatedAt: now,
        })
        .where(eq(pullRequestsTable.id, pullRequestId));

      // ── 6. Insert immutable ship audit record ─────────────────────────────
      const [auditRecord] = await tx
        .insert(releaseShipAuditsTable)
        .values({
          organizationId,
          releaseId: release.id,
          pullRequestId,
          shippedBy: userId,
          releaseVersion: releaseVersion ?? null,
          notes: notes ?? null,
          shippedAt: now,
        })
        .returning();

      logger.info(
        `[ShipService] shipRelease: PR ${pullRequestId} shipped by user ${userId}`,
        {
          organizationId,
          pullRequestId,
          releaseId: release.id,
          releaseStatus: "SHIPPED",
          releaseVersion: releaseVersion ?? null,
          shipAuditId: auditRecord?.id,
        }
      );

      return {
        release: {
          ...release,
          status: "SHIPPED" as const,
          shippedAt: now,
          shippedBy: userId,
          releaseVersion: releaseVersion ?? null,
        },
        auditRecord,
      };
    });
  }

  /**
   * Returns the current release status and ship metadata for a pull request.
   * Safe to call before the release has been shipped — returns null ship fields.
   */
  public async getShipStatus(organizationId: string, pullRequestId: string) {
    await this.assertPullRequest(organizationId, pullRequestId);

    const [release] = await db
      .select()
      .from(releasesTable)
      .where(
        and(
          eq(releasesTable.pullRequestId, pullRequestId),
          eq(releasesTable.organizationId, organizationId)
        )
      )
      .limit(1);

    return {
      releaseStatus: release?.status ?? "NOT_READY",
      shippedAt: release?.shippedAt ?? null,
      shippedBy: release?.shippedBy ?? null,
      releaseVersion: release?.releaseVersion ?? null,
      releaseId: release?.id ?? null,
    };
  }

  /**
   * Returns all ship audit records for a pull request in reverse chronological
   * order. Each row is an immutable record of a ship action.
   */
  public async getShipHistory(organizationId: string, pullRequestId: string) {
    await this.assertPullRequest(organizationId, pullRequestId);

    return db
      .select({
        id: releaseShipAuditsTable.id,
        releaseId: releaseShipAuditsTable.releaseId,
        shippedBy: releaseShipAuditsTable.shippedBy,
        releaseVersion: releaseShipAuditsTable.releaseVersion,
        notes: releaseShipAuditsTable.notes,
        shippedAt: releaseShipAuditsTable.shippedAt,
      })
      .from(releaseShipAuditsTable)
      .where(
        and(
          eq(releaseShipAuditsTable.pullRequestId, pullRequestId),
          eq(releaseShipAuditsTable.organizationId, organizationId)
        )
      )
      .orderBy(desc(releaseShipAuditsTable.shippedAt));
  }
}

export const shipService = new ShipService();
