import { db, eq, and, isNull } from "@repo/database";
import { membershipsTable, organizationsTable } from "@repo/database/schema";
import { auditService } from "./audit.js";

export class WorkspaceService {
  public async getWorkspaces(userId: string) {
    const records = await db
      .select({
        membershipId: membershipsTable.id,
        role: membershipsTable.role,
        workspace: organizationsTable,
      })
      .from(membershipsTable)
      .innerJoin(
        organizationsTable,
        eq(membershipsTable.organizationId, organizationsTable.id)
      )
      .where(
        and(
          eq(membershipsTable.userId, userId),
          isNull(organizationsTable.deletedAt)
        )
      );

    return records.map((r) => ({
      workspace: r.workspace,
      role: r.role,
    }));
  }

  public async switchWorkspace(userId: string, workspaceId: string, requestId: string) {
    const [record] = await db
      .select({
        membership: membershipsTable,
        workspace: organizationsTable,
      })
      .from(membershipsTable)
      .innerJoin(
        organizationsTable,
        eq(membershipsTable.organizationId, organizationsTable.id)
      )
      .where(
        and(
          eq(membershipsTable.userId, userId),
          eq(membershipsTable.organizationId, workspaceId),
          isNull(organizationsTable.deletedAt)
        )
      )
      .limit(1);

    if (!record) {
      throw new Error("WORKSPACE_ACCESS_DENIED");
    }

    auditService.logWorkspaceSwitched(userId, null, workspaceId, requestId);

    return {
      workspace: record.workspace,
      role: record.membership.role,
    };
  }

  public async createWorkspace(userId: string, name: string, requestId: string) {
    // Generate clean slug
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const slug = `${cleanName}-${Date.now().toString().slice(-4)}`;

    // Execute inside a database transaction
    const result = await db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(organizationsTable)
        .values({
          name,
          slug,
        })
        .returning();

      if (!workspace) {
        throw new Error("WORKSPACE_CREATION_FAILED");
      }

      await tx.insert(membershipsTable).values({
        userId,
        organizationId: workspace.id,
        role: "OWNER",
      });

      return workspace;
    });

    auditService.logWorkspaceCreated(userId, result.id, requestId);

    return {
      workspace: result,
      role: "OWNER" as const,
    };
  }
}

export const workspaceService = new WorkspaceService();
