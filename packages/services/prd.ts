import { db, eq, and, desc, isNull } from "@repo/database";
import { prdsTable, featureRequestsTable } from "@repo/database/schema";
import { auditService } from "./audit.js";
import { getPRDProvider } from "@repo/ai";

export class PRDService {
  /**
   * Generates a new PRD from a Feature Request in the READY_FOR_PRD (or PRD_GENERATED for regeneration) state.
   * Increments the version if a PRD already exists for the Feature Request.
   */
  public async generatePRD(
    userId: string,
    workspaceId: string,
    featureRequestId: string,
    requestId: string
  ) {
    // 1. Fetch feature request
    const [featureRequest] = await db
      .select()
      .from(featureRequestsTable)
      .where(
        and(
          eq(featureRequestsTable.id, featureRequestId),
          eq(featureRequestsTable.organizationId, workspaceId),
          isNull(featureRequestsTable.deletedAt)
        )
      )
      .limit(1);

    if (!featureRequest) {
      throw new Error("FEATURE_REQUEST_NOT_FOUND");
    }

    // 2. Validate current status
    if (
      featureRequest.status !== "READY_FOR_PRD" &&
      featureRequest.status !== "PRD_GENERATED"
    ) {
      throw new Error("INVALID_FEATURE_REQUEST_STATUS");
    }

    // 3. Determine version number
    const existingPrds = await db
      .select({ version: prdsTable.version })
      .from(prdsTable)
      .where(
        and(
          eq(prdsTable.featureRequestId, featureRequestId),
          eq(prdsTable.organizationId, workspaceId)
        )
      )
      .orderBy(desc(prdsTable.version))
      .limit(1);

    const latestVersion = existingPrds[0]?.version ?? 0;
    const nextVersion = latestVersion + 1;

    // 4. Generate PRD content using AI provider
    const provider = getPRDProvider();
    const prdData = await provider.generatePRD(
      featureRequest.title,
      featureRequest.description
    );

    // 5. Persist PRD and update Feature Request status atomically
    const newPrd = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(prdsTable)
        .values({
          organizationId: workspaceId,
          featureRequestId: featureRequestId,
          problemStatement: prdData.problemStatement,
          goals: prdData.goals,
          nonGoals: prdData.nonGoals,
          userStories: prdData.userStories,
          acceptanceCriteria: prdData.acceptanceCriteria,
          edgeCases: prdData.edgeCases,
          successMetrics: prdData.successMetrics,
          content: prdData, // Entire structured JSON containing title, summary, etc.
          version: nextVersion,
        })
        .returning();

      if (!inserted) {
        throw new Error("PRD_PERSISTENCE_FAILED");
      }

      // Update status to PRD_GENERATED if not already set
      if (featureRequest.status !== "PRD_GENERATED") {
        await tx
          .update(featureRequestsTable)
          .set({
            status: "PRD_GENERATED",
            updatedAt: new Date(),
          })
          .where(eq(featureRequestsTable.id, featureRequestId));
      }

      return inserted;
    });

    // 6. Audit logging
    if (nextVersion === 1) {
      auditService.logPRDGenerated(
        userId,
        workspaceId,
        featureRequestId,
        newPrd.id,
        newPrd.version,
        requestId
      );
    } else {
      auditService.logPRDRegenerated(
        userId,
        workspaceId,
        featureRequestId,
        newPrd.id,
        latestVersion,
        newPrd.version,
        requestId
      );
    }

    return newPrd;
  }

  /**
   * Retrieves a specific PRD by ID, ensuring it belongs to the active workspace.
   */
  public async getPRD(workspaceId: string, prdId: string) {
    const [prd] = await db
      .select()
      .from(prdsTable)
      .where(
        and(
          eq(prdsTable.id, prdId),
          eq(prdsTable.organizationId, workspaceId)
        )
      )
      .limit(1);

    return prd || null;
  }

  /**
   * Retrieves the latest PRD version for a given Feature Request.
   */
  public async getLatestPRDForFeatureRequest(workspaceId: string, featureRequestId: string) {
    const [prd] = await db
      .select()
      .from(prdsTable)
      .where(
        and(
          eq(prdsTable.featureRequestId, featureRequestId),
          eq(prdsTable.organizationId, workspaceId)
        )
      )
      .orderBy(desc(prdsTable.version))
      .limit(1);

    return prd || null;
  }

  /**
   * Retrieves all versions of a PRD for a given Feature Request, sorted descending by version.
   */
  public async getPRDVersions(workspaceId: string, featureRequestId: string) {
    return await db
      .select()
      .from(prdsTable)
      .where(
        and(
          eq(prdsTable.featureRequestId, featureRequestId),
          eq(prdsTable.organizationId, workspaceId)
        )
      )
      .orderBy(desc(prdsTable.version));
  }

  /**
   * Lists the latest version of all PRDs generated in the workspace.
   */
  public async listPRDs(workspaceId: string) {
    // Standard query: select all PRDs in the workspace and join with feature requests to display metadata
    const results = await db
      .select({
        prd: prdsTable,
        featureRequest: featureRequestsTable,
      })
      .from(prdsTable)
      .innerJoin(
        featureRequestsTable,
        eq(prdsTable.featureRequestId, featureRequestsTable.id)
      )
      .where(
        and(
          eq(prdsTable.organizationId, workspaceId),
          isNull(featureRequestsTable.deletedAt)
        )
      )
      .orderBy(desc(prdsTable.createdAt));

    // To prevent returning multiple versions of the same feature request PRD in the main list view,
    // we can filter them to return only the latest version of each PRD in TypeScript,
    // or just let the front-end group them. Filtering in TypeScript is very simple and robust.
    const latestMap = new Map<string, typeof results[0]>();
    for (const row of results) {
      const existing = latestMap.get(row.prd.featureRequestId);
      if (!existing || row.prd.version > existing.prd.version) {
        latestMap.set(row.prd.featureRequestId, row);
      }
    }

    return Array.from(latestMap.values()).map((row) => ({
      ...row.prd,
      featureRequest: row.featureRequest,
    }));
  }
}

export const prdService = new PRDService();
