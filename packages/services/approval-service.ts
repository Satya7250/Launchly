import { db, eq, and, desc, inArray, count } from "@repo/database";
import {
  releasesTable,
  releaseApprovalsTable,
  pullRequestsTable,
  aiReviewsTable,
  aiReviewFindingsTable,
  repositoriesTable,
  engineeringTasksTable,
} from "@repo/database/schema";
import { logger } from "@repo/logger";

export class ApprovalServiceError extends Error {
  constructor(
    public readonly code:
      | "PULL_REQUEST_NOT_FOUND"
      | "PROJECT_NOT_FOUND"
      | "RELEASE_NOT_FOUND"
      | "INVALID_TRANSITION"
      | "AI_REVIEW_NOT_COMPLETED"
      | "BLOCKING_FINDINGS_EXIST"
      | "NO_PENDING_APPROVAL_REQUEST"
      | "APPROVAL_FAILED",
    message: string
  ) {
    super(message);
    this.name = "ApprovalServiceError";
  }
}

export class ApprovalService {
  /**
   * Asserts workspace ownership of a pull request and returns its details.
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
      throw new ApprovalServiceError(
        "PULL_REQUEST_NOT_FOUND",
        `Pull request ${pullRequestId} not found in workspace ${organizationId}`
      );
    }
    return pr;
  }

  /**
   * Get the current approval checklist and release status.
   */
  public async getApprovalStatus(organizationId: string, pullRequestId: string) {
    const pr = await this.assertPullRequest(organizationId, pullRequestId);

    // 1. Check if PRD exists
    const prdExists = !!pr.prdId;

    // 2. Check if engineering tasks exist
    let tasksExist = false;
    if (pr.prdId) {
      const [tasksCount] = await db
        .select({ count: count() })
        .from(engineeringTasksTable)
        .where(
          and(
            eq(engineeringTasksTable.prdId, pr.prdId),
            eq(engineeringTasksTable.organizationId, organizationId)
          )
        );
      tasksExist = (tasksCount?.count ?? 0) > 0;
    }

    // 3. Check if Latest AI Review is completed & blocking findings count
    const [latestReview] = await db
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

    const aiReviewCompleted = latestReview?.status === "COMPLETED";

    let blockingFindingsCount = 0;
    if (latestReview) {
      const [findingsCount] = await db
        .select({ count: count() })
        .from(aiReviewFindingsTable)
        .where(
          and(
            eq(aiReviewFindingsTable.reviewId, latestReview.id),
            inArray(aiReviewFindingsTable.severity, ["CRITICAL", "HIGH"])
          )
        );
      blockingFindingsCount = findingsCount?.count ?? 0;
    }

    // 4. Get release status
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

    const releaseStatus = release?.status ?? "NOT_READY";

    // 5. Get latest approval record
    const [latestApproval] = await db
      .select()
      .from(releaseApprovalsTable)
      .where(
        and(
          eq(releaseApprovalsTable.pullRequestId, pullRequestId),
          eq(releaseApprovalsTable.organizationId, organizationId)
        )
      )
      .orderBy(desc(releaseApprovalsTable.createdAt))
      .limit(1);

    return {
      checklist: {
        prdExists,
        tasksExist,
        pullRequestExists: true,
        aiReviewCompleted,
        blockingFindingsCount,
      },
      releaseStatus,
      latestApproval: latestApproval ?? null,
    };
  }

  /**
   * Request approval for a release (moves status to READY_FOR_APPROVAL).
   */
  public async requestApproval(
    userId: string,
    organizationId: string,
    pullRequestId: string,
    comments?: string
  ) {
    return db.transaction(async (tx) => {
      const pr = await tx
        .select()
        .from(pullRequestsTable)
        .where(
          and(
            eq(pullRequestsTable.id, pullRequestId),
            eq(pullRequestsTable.organizationId, organizationId)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!pr) {
        throw new ApprovalServiceError(
          "PULL_REQUEST_NOT_FOUND",
          `Pull request ${pullRequestId} not found in workspace ${organizationId}`
        );
      }

      // Fetch repo to get project_id
      const [repo] = await tx
        .select({ projectId: repositoriesTable.projectId })
        .from(repositoriesTable)
        .where(eq(repositoriesTable.id, pr.repositoryId))
        .limit(1);

      if (!repo || !repo.projectId) {
        throw new ApprovalServiceError(
          "PROJECT_NOT_FOUND",
          `Repository associated with PR is not linked to a project`
        );
      }

      // Fetch current release record
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

      const currentStatus = release?.status ?? "NOT_READY";

      // Validate Transition: Target = READY_FOR_APPROVAL
      // Allowed from NOT_READY or REJECTED
      if (currentStatus !== "NOT_READY" && currentStatus !== "REJECTED") {
        throw new ApprovalServiceError(
          "INVALID_TRANSITION",
          `Cannot request approval when release status is ${currentStatus}`
        );
      }

      // Fetch latest review
      const [latestReview] = await tx
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

      // Create or update Release row status to READY_FOR_APPROVAL
      if (!release) {
        await tx.insert(releasesTable).values({
          organizationId,
          pullRequestId,
          version: `v${pr.number}`,
          status: "READY_FOR_APPROVAL",
        });
      } else {
        await tx
          .update(releasesTable)
          .set({
            status: "READY_FOR_APPROVAL",
            updatedAt: new Date(),
          })
          .where(eq(releasesTable.id, release.id));
      }

      // Insert new PENDING release approval record (Audit entry)
      const [approvalRecord] = await tx
        .insert(releaseApprovalsTable)
        .values({
          organizationId,
          projectId: repo.projectId,
          pullRequestId,
          reviewId: latestReview?.id ?? null,
          reviewVersion: latestReview?.version ?? null,
          approvedBy: null,
          status: "PENDING",
          comments: comments || null,
        })
        .returning();

      logger.info(
        `[ApprovalService] requestApproval: approval requested for PR ${pullRequestId}`,
        {
          organizationId,
          pullRequestId,
          releaseStatus: "READY_FOR_APPROVAL",
          approvalRecordId: approvalRecord?.id,
        }
      );

      return approvalRecord;
    });
  }

  /**
   * Approve a release (moves status to APPROVED).
   */
  public async approveRelease(
    userId: string,
    organizationId: string,
    pullRequestId: string,
    comments?: string
  ) {
    return db.transaction(async (tx) => {
      const pr = await tx
        .select()
        .from(pullRequestsTable)
        .where(
          and(
            eq(pullRequestsTable.id, pullRequestId),
            eq(pullRequestsTable.organizationId, organizationId)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!pr) {
        throw new ApprovalServiceError(
          "PULL_REQUEST_NOT_FOUND",
          `Pull request ${pullRequestId} not found in workspace ${organizationId}`
        );
      }

      const [repo] = await tx
        .select({ projectId: repositoriesTable.projectId })
        .from(repositoriesTable)
        .where(eq(repositoriesTable.id, pr.repositoryId))
        .limit(1);

      if (!repo || !repo.projectId) {
        throw new ApprovalServiceError(
          "PROJECT_NOT_FOUND",
          `Repository associated with PR is not linked to a project`
        );
      }

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

      const currentStatus = release?.status ?? "NOT_READY";

      // Validate Transition: Target = APPROVED
      // Allowed from READY_FOR_APPROVAL
      if (currentStatus !== "READY_FOR_APPROVAL") {
        throw new ApprovalServiceError(
          "INVALID_TRANSITION",
          `Cannot approve release when status is ${currentStatus}`
        );
      }

      // Explicit guard so TypeScript narrows `release` to a defined value
      if (!release) {
        throw new ApprovalServiceError(
          "RELEASE_NOT_FOUND",
          `No release record found for pull request ${pullRequestId}`
        );
      }

      // Fetch latest AI review
      const [latestReview] = await tx
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

      // Validate Checklist conditions
      if (!latestReview || latestReview.status !== "COMPLETED") {
        throw new ApprovalServiceError(
          "AI_REVIEW_NOT_COMPLETED",
          "Cannot approve release: Latest AI review must be COMPLETED"
        );
      }

      const [findingsCount] = await tx
        .select({ count: count() })
        .from(aiReviewFindingsTable)
        .where(
          and(
            eq(aiReviewFindingsTable.reviewId, latestReview.id),
            inArray(aiReviewFindingsTable.severity, ["CRITICAL", "HIGH"])
          )
        );

      if ((findingsCount?.count ?? 0) > 0) {
        throw new ApprovalServiceError(
          "BLOCKING_FINDINGS_EXIST",
          `Cannot approve release: ${findingsCount?.count} blocking findings remain`
        );
      }

      // Update release status to APPROVED
      await tx
        .update(releasesTable)
        .set({
          status: "APPROVED",
          updatedAt: new Date(),
        })
        .where(eq(releasesTable.id, release.id));

      // Update PR status to APPROVED and processingStatus to HUMAN_APPROVED
      await tx
        .update(pullRequestsTable)
        .set({
          status: "APPROVED",
          processingStatus: "HUMAN_APPROVED",
          updatedAt: new Date(),
        })
        .where(eq(pullRequestsTable.id, pullRequestId));

      // Append APPROVED release approval record (Audit entry)
      const [approvalRecord] = await tx
        .insert(releaseApprovalsTable)
        .values({
          organizationId,
          projectId: repo.projectId,
          pullRequestId,
          reviewId: latestReview.id,
          reviewVersion: latestReview.version,
          approvedBy: userId,
          status: "APPROVED",
          comments: comments || null,
        })
        .returning();

      logger.info(
        `[ApprovalService] approveRelease: PR ${pullRequestId} approved by user ${userId}`,
        {
          organizationId,
          pullRequestId,
          releaseStatus: "APPROVED",
          approvalRecordId: approvalRecord?.id,
        }
      );

      return approvalRecord;
    });
  }

  /**
   * Reject a release (moves status to REJECTED).
   */
  public async rejectRelease(
    userId: string,
    organizationId: string,
    pullRequestId: string,
    comments: string
  ) {
    return db.transaction(async (tx) => {
      const pr = await tx
        .select()
        .from(pullRequestsTable)
        .where(
          and(
            eq(pullRequestsTable.id, pullRequestId),
            eq(pullRequestsTable.organizationId, organizationId)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!pr) {
        throw new ApprovalServiceError(
          "PULL_REQUEST_NOT_FOUND",
          `Pull request ${pullRequestId} not found in workspace ${organizationId}`
        );
      }

      const [repo] = await tx
        .select({ projectId: repositoriesTable.projectId })
        .from(repositoriesTable)
        .where(eq(repositoriesTable.id, pr.repositoryId))
        .limit(1);

      if (!repo || !repo.projectId) {
        throw new ApprovalServiceError(
          "PROJECT_NOT_FOUND",
          `Repository associated with PR is not linked to a project`
        );
      }

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

      const currentStatus = release?.status ?? "NOT_READY";

      // Validate Transition: Target = REJECTED
      // Allowed from READY_FOR_APPROVAL
      if (currentStatus !== "READY_FOR_APPROVAL") {
        throw new ApprovalServiceError(
          "INVALID_TRANSITION",
          `Cannot reject release when status is ${currentStatus}`
        );
      }

      // Explicit guard so TypeScript narrows `release` to a defined value
      if (!release) {
        throw new ApprovalServiceError(
          "RELEASE_NOT_FOUND",
          `No release record found for pull request ${pullRequestId}`
        );
      }

      // Fetch latest AI review
      const [latestReview] = await tx
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

      // Update release status to REJECTED
      await tx
        .update(releasesTable)
        .set({
          status: "REJECTED",
          updatedAt: new Date(),
        })
        .where(eq(releasesTable.id, release.id));

      // Update PR status to CHANGES_REQUESTED and processingStatus to READY_FOR_AI_REVIEW (to allow refetch and regenerate review)
      await tx
        .update(pullRequestsTable)
        .set({
          status: "CHANGES_REQUESTED",
          processingStatus: "READY_FOR_AI_REVIEW",
          updatedAt: new Date(),
        })
        .where(eq(pullRequestsTable.id, pullRequestId));

      // Append REJECTED release approval record (Audit entry)
      const [approvalRecord] = await tx
        .insert(releaseApprovalsTable)
        .values({
          organizationId,
          projectId: repo.projectId,
          pullRequestId,
          reviewId: latestReview?.id ?? null,
          reviewVersion: latestReview?.version ?? null,
          approvedBy: userId,
          status: "REJECTED",
          comments,
        })
        .returning();

      logger.info(
        `[ApprovalService] rejectRelease: PR ${pullRequestId} rejected by user ${userId}`,
        {
          organizationId,
          pullRequestId,
          releaseStatus: "REJECTED",
          approvalRecordId: approvalRecord?.id,
        }
      );

      return approvalRecord;
    });
  }

  /**
   * Get historical audit log of approvals/rejections for a pull request.
   */
  public async getApprovalHistory(organizationId: string, pullRequestId: string) {
    await this.assertPullRequest(organizationId, pullRequestId);

    return db
      .select({
        id: releaseApprovalsTable.id,
        status: releaseApprovalsTable.status,
        comments: releaseApprovalsTable.comments,
        createdAt: releaseApprovalsTable.createdAt,
        reviewVersion: releaseApprovalsTable.reviewVersion,
        approvedBy: releaseApprovalsTable.approvedBy,
      })
      .from(releaseApprovalsTable)
      .where(
        and(
          eq(releaseApprovalsTable.pullRequestId, pullRequestId),
          eq(releaseApprovalsTable.organizationId, organizationId)
        )
      )
      .orderBy(desc(releaseApprovalsTable.createdAt));
  }
}

export const approvalService = new ApprovalService();
