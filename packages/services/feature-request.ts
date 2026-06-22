import { db, eq, and, isNull } from "@repo/database";
import { featureRequestsTable, projectsTable } from "@repo/database/schema";
import { auditService } from "./audit.js";
import { clarificationService } from "./clarification.js";

export class FeatureRequestService {
  public async createFeatureRequest(
    userId: string,
    workspaceId: string,
    projectId: string,
    title: string,
    description: string,
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    source: "MANUAL" | "EMAIL" | "API" | "SUPPORT",
    requestId: string
  ) {
    // 1. Verify that project exists, belongs to active workspace, and is active
    const [project] = await db
      .select()
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.organizationId, workspaceId),
          isNull(projectsTable.deletedAt)
        )
      )
      .limit(1);

    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    // 2. Assess description requirements readiness
    const isReady = await clarificationService.determineReadiness(description);
    const initialStatus = isReady ? ("READY_FOR_PRD" as const) : ("NEW" as const);

    // 3. Create the feature request
    const [featureRequest] = await db
      .insert(featureRequestsTable)
      .values({
        organizationId: workspaceId,
        projectId,
        createdByUserId: userId,
        title,
        description,
        priority,
        source,
        status: initialStatus,
      })
      .returning();

    if (!featureRequest) {
      throw new Error("FEATURE_REQUEST_CREATION_FAILED");
    }

    return featureRequest;
  }

  public async updateFeatureRequest(
    userId: string,
    workspaceId: string,
    featureRequestId: string,
    fields: Partial<{
      title: string;
      description: string;
      priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      source: "MANUAL" | "EMAIL" | "API" | "SUPPORT";
    }>,
    requestId: string
  ) {
    const [featureRequest] = await db
      .update(featureRequestsTable)
      .set({
        ...fields,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(featureRequestsTable.id, featureRequestId),
          eq(featureRequestsTable.organizationId, workspaceId),
          isNull(featureRequestsTable.deletedAt)
        )
      )
      .returning();

    if (!featureRequest) {
      throw new Error("FEATURE_REQUEST_NOT_FOUND");
    }

    return featureRequest;
  }

  public async changeStatus(
    userId: string,
    workspaceId: string,
    featureRequestId: string,
    nextStatus: "NEW" | "CLARIFICATION_REQUIRED" | "READY_FOR_PRD" | "PRD_GENERATED",
    requestId: string
  ) {
    // 1. Fetch current status
    const [current] = await db
      .select({
        status: featureRequestsTable.status,
      })
      .from(featureRequestsTable)
      .where(
        and(
          eq(featureRequestsTable.id, featureRequestId),
          eq(featureRequestsTable.organizationId, workspaceId),
          isNull(featureRequestsTable.deletedAt)
        )
      )
      .limit(1);

    if (!current) {
      throw new Error("FEATURE_REQUEST_NOT_FOUND");
    }

    const currentStatus = current.status;

    // 2. Validate transitions
    // Transitions logic:
    // NEW -> CLARIFICATION_REQUIRED or READY_FOR_PRD
    // CLARIFICATION_REQUIRED -> READY_FOR_PRD
    // READY_FOR_PRD -> PRD_GENERATED
    let isValid = false;

    if (currentStatus === nextStatus) {
      isValid = true;
    } else if (currentStatus === "NEW") {
      isValid = nextStatus === "CLARIFICATION_REQUIRED" || nextStatus === "READY_FOR_PRD";
    } else if (currentStatus === "CLARIFICATION_REQUIRED") {
      isValid = nextStatus === "READY_FOR_PRD";
    } else if (currentStatus === "READY_FOR_PRD") {
      isValid = nextStatus === "PRD_GENERATED";
    }

    if (!isValid) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    const [updated] = await db
      .update(featureRequestsTable)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(featureRequestsTable.id, featureRequestId),
          eq(featureRequestsTable.organizationId, workspaceId)
        )
      )
      .returning();

    return updated;
  }

  public async archiveFeatureRequest(
    userId: string,
    workspaceId: string,
    featureRequestId: string,
    requestId: string
  ) {
    const [archived] = await db
      .update(featureRequestsTable)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(featureRequestsTable.id, featureRequestId),
          eq(featureRequestsTable.organizationId, workspaceId),
          isNull(featureRequestsTable.deletedAt)
        )
      )
      .returning();

    if (!archived) {
      throw new Error("FEATURE_REQUEST_NOT_FOUND");
    }

    return archived;
  }

  public async listFeatureRequests(workspaceId: string, projectId?: string) {
    const filters = [
      eq(featureRequestsTable.organizationId, workspaceId),
      isNull(featureRequestsTable.deletedAt),
    ];

    if (projectId) {
      filters.push(eq(featureRequestsTable.projectId, projectId));
    }

    const results = await db
      .select({
        featureRequest: featureRequestsTable,
        project: projectsTable,
      })
      .from(featureRequestsTable)
      .innerJoin(projectsTable, eq(featureRequestsTable.projectId, projectsTable.id))
      .where(and(...filters))
      .orderBy(featureRequestsTable.createdAt);

    return results.map((r) => ({
      ...r.featureRequest,
      project: r.project,
    }));
  }

  public async getFeatureRequest(workspaceId: string, featureRequestId: string) {
    const [result] = await db
      .select({
        featureRequest: featureRequestsTable,
        project: projectsTable,
      })
      .from(featureRequestsTable)
      .innerJoin(projectsTable, eq(featureRequestsTable.projectId, projectsTable.id))
      .where(
        and(
          eq(featureRequestsTable.id, featureRequestId),
          eq(featureRequestsTable.organizationId, workspaceId),
          isNull(featureRequestsTable.deletedAt)
        )
      )
      .limit(1);

    if (!result) return null;

    return {
      ...result.featureRequest,
      project: result.project,
    };
  }
}

export const featureRequestService = new FeatureRequestService();
