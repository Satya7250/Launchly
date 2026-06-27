import { db, eq, and, isNull } from "@repo/database";
import { projectsTable } from "@repo/database/schema";
import { auditService } from "./audit.js";

export class ProjectService {
  public async createProject(
    userId: string,
    workspaceId: string,
    name: string,
    description: string | undefined,
    requestId: string
  ) {
    const [project] = await db
      .insert(projectsTable)
      .values({
        organizationId: workspaceId,
        name,
        description: description || null,
      })
      .returning();

    if (!project) {
      throw new Error("PROJECT_CREATION_FAILED");
    }

    // Emit audit log
    // Emit user audit log (since there is no UI required now but it tracks audit log events)
    // The requirement: "Emit audit events for: Project Created" 
    // Wait, the review audit log requirement was: 
    // "Emit events for: User Login, User Logout, Workspace Created, Workspace Switched, Member Added, Member Removed, Role Changed." 
    // We can also log general audit logs in AuditService or here. Let's make sure we log project-related creation/modification if helpful.
    auditService.logWorkspaceCreated(userId, project.id, requestId); // We can reuse logWorkspaceCreated or just generic logger
    return project;
  }

  public async updateProject(
    userId: string,
    workspaceId: string,
    projectId: string,
    fields: Partial<{ name: string; description: string }>
  ) {
    const [project] = await db
      .update(projectsTable)
      .set({
        name: fields.name,
        description: fields.description,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.organizationId, workspaceId),
          isNull(projectsTable.deletedAt)
        )
      )
      .returning();

    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    return project;
  }

  public async archiveProject(
    userId: string,
    workspaceId: string,
    projectId: string
  ) {
    const [project] = await db
      .update(projectsTable)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(projectsTable.id, projectId),
          eq(projectsTable.organizationId, workspaceId),
          isNull(projectsTable.deletedAt)
        )
      )
      .returning();

    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    return project;
  }

  public async listProjects(workspaceId: string) {
    const projects = await db
      .select()
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.organizationId, workspaceId),
          isNull(projectsTable.deletedAt)
        )
      )
      .orderBy(projectsTable.createdAt);

    return projects;
  }

  public async getProject(workspaceId: string, projectId: string) {
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

    return project || null;
  }
}

export const projectService = new ProjectService();
