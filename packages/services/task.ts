import { db, eq, and, desc } from "@repo/database";
import { engineeringTasksTable, prdsTable, featureRequestsTable, taskGenerationAuditsTable } from "@repo/database/schema";
import { inngest } from "@repo/inngest";
import { TaskStatus } from "@repo/shared";
import { randomUUID } from "node:crypto";

export class TaskService {
  /**
   * Fetch the latest version number of tasks generated for a PRD.
   */
  public async getLatestVersionForPrd(workspaceId: string, prdId: string): Promise<number> {
    const result = await db
      .select({ version: engineeringTasksTable.version })
      .from(engineeringTasksTable)
      .where(
        and(
          eq(engineeringTasksTable.prdId, prdId),
          eq(engineeringTasksTable.organizationId, workspaceId)
        )
      )
      .orderBy(desc(engineeringTasksTable.version))
      .limit(1);
    return result[0]?.version ?? 0;
  }

  /**
   * List tasks for a PRD and version. If version is omitted, returns the latest version.
   */
  public async listTasks(workspaceId: string, prdId: string, version?: number) {
    const targetVersion = version ?? (await this.getLatestVersionForPrd(workspaceId, prdId));
    if (targetVersion === 0) return [];

    return await db
      .select()
      .from(engineeringTasksTable)
      .where(
        and(
          eq(engineeringTasksTable.organizationId, workspaceId),
          eq(engineeringTasksTable.prdId, prdId),
          eq(engineeringTasksTable.version, targetVersion)
        )
      )
      .orderBy(engineeringTasksTable.position);
  }

  /**
   * List task versions for a PRD.
   */
  public async listTaskVersions(workspaceId: string, prdId: string): Promise<number[]> {
    const result = await db
      .select({ version: engineeringTasksTable.version })
      .from(engineeringTasksTable)
      .where(
        and(
          eq(engineeringTasksTable.prdId, prdId),
          eq(engineeringTasksTable.organizationId, workspaceId)
        )
      )
      .groupBy(engineeringTasksTable.version)
      .orderBy(desc(engineeringTasksTable.version));

    return result.map((r) => r.version);
  }

  /**
   * Get the latest generation status and details for a PRD.
   */
  public async getGenerationStatus(workspaceId: string, prdId: string) {
    const [latestAudit] = await db
      .select()
      .from(taskGenerationAuditsTable)
      .where(
        and(
          eq(taskGenerationAuditsTable.organizationId, workspaceId),
          eq(taskGenerationAuditsTable.prdId, prdId)
        )
      )
      .orderBy(desc(taskGenerationAuditsTable.startedAt))
      .limit(1);

    if (!latestAudit) {
      return { status: "NOT_STARTED" as const, error: null };
    }

    return {
      status: latestAudit.status,
      error: latestAudit.error,
      startedAt: latestAudit.startedAt,
      completedAt: latestAudit.completedAt,
    };
  }

  /**
   * Get the complete task generation audit history for a PRD.
   */
  public async getGenerationHistory(workspaceId: string, prdId: string) {
    return await db
      .select()
      .from(taskGenerationAuditsTable)
      .where(
        and(
          eq(taskGenerationAuditsTable.organizationId, workspaceId),
          eq(taskGenerationAuditsTable.prdId, prdId)
        )
      )
      .orderBy(desc(taskGenerationAuditsTable.startedAt));
  }

  /**
   * Update task status.
   */
  public async updateTaskStatus(workspaceId: string, taskId: string, status: TaskStatus) {
    const [updated] = await db
      .update(engineeringTasksTable)
      .set({ status, updatedAt: new Date() })
      .where(
        and(
          eq(engineeringTasksTable.id, taskId),
          eq(engineeringTasksTable.organizationId, workspaceId)
        )
      )
      .returning();
    return updated || null;
  }

  /**
   * Update task position.
   */
  public async updateTaskPosition(workspaceId: string, taskId: string, position: number) {
    const [updated] = await db
      .update(engineeringTasksTable)
      .set({ position, updatedAt: new Date() })
      .where(
        and(
          eq(engineeringTasksTable.id, taskId),
          eq(engineeringTasksTable.organizationId, workspaceId)
        )
      )
      .returning();
    return updated || null;
  }

  /**
   * Delete a task.
   */
  public async deleteTask(workspaceId: string, taskId: string) {
    const [deleted] = await db
      .delete(engineeringTasksTable)
      .where(
        and(
          eq(engineeringTasksTable.id, taskId),
          eq(engineeringTasksTable.organizationId, workspaceId)
        )
      )
      .returning();
    return deleted || null;
  }

  /**
   * Trigger async generation or regeneration of tasks for a PRD.
   */
  public async triggerTaskGeneration(workspaceId: string, prdId: string) {
    const generationId = randomUUID();
    const idempotencyKey = `idemp-${generationId}`;
    const useMock = process.env.MOCK_AI === 'true';

    let projectId: string | undefined = undefined;

    await db.transaction(async (tx) => {
      // 1. Lock the PRD row to serialize concurrent generation requests for this PRD
      const [prd] = await tx
        .select()
        .from(prdsTable)
        .where(
          and(
            eq(prdsTable.id, prdId),
            eq(prdsTable.organizationId, workspaceId)
          )
        )
        .for("update");

      if (!prd) {
        throw new Error("PRD_NOT_FOUND");
      }

      // 2. Fetch the corresponding feature request
      const [featureRequest] = await tx
        .select()
        .from(featureRequestsTable)
        .where(
          and(
            eq(featureRequestsTable.id, prd.featureRequestId),
            eq(featureRequestsTable.organizationId, workspaceId)
          )
        )
        .limit(1);

      if (!featureRequest) {
        throw new Error("FEATURE_REQUEST_NOT_FOUND");
      }

      projectId = featureRequest.projectId;

      // 3. Check if there is already an active generation in progress
      const [latestAudit] = await tx
        .select()
        .from(taskGenerationAuditsTable)
        .where(
          and(
            eq(taskGenerationAuditsTable.organizationId, workspaceId),
            eq(taskGenerationAuditsTable.prdId, prdId)
          )
        )
        .orderBy(desc(taskGenerationAuditsTable.startedAt))
        .limit(1);

      if (latestAudit && (latestAudit.status === "QUEUED" || latestAudit.status === "GENERATING")) {
        throw new Error("GENERATION_IN_PROGRESS");
      }

      // 4. Insert initial audit record
      await tx.insert(taskGenerationAuditsTable).values({
        id: generationId,
        organizationId: workspaceId,
        prdId: prdId,
        provider: useMock ? "mock" : "openai",
        model: useMock ? "mock" : "gpt-4o-mini",
        promptVersion: "v1",
        status: "QUEUED",
        idempotencyKey,
        startedAt: new Date(),
      });
    });

    if (!projectId) {
      throw new Error("PROJECT_ID_NOT_FOUND");
    }

    await inngest.send({
      name: "task.generate",
      data: {
        workspaceId,
        prdId,
        projectId,
        generationId,
      },
    });

    return { success: true, generationId };
  }
}

export const taskService = new TaskService();

