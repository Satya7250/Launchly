import { logger } from "@repo/logger";

export class AuditService {
  public logLogin(userId: string, requestId: string): void {
    logger.info(`[AUDIT] User Login - UserID: ${userId}`, {
      event: "USER_LOGIN",
      userId,
      requestId,
      timestamp: Date.now(),
    });
  }

  public logLogout(userId: string, requestId: string): void {
    logger.info(`[AUDIT] User Logout - UserID: ${userId}`, {
      event: "USER_LOGOUT",
      userId,
      requestId,
      timestamp: Date.now(),
    });
  }

  public logWorkspaceCreated(userId: string, workspaceId: string, requestId: string): void {
    logger.info(`[AUDIT] Workspace Created - WorkspaceID: ${workspaceId} by UserID: ${userId}`, {
      event: "WORKSPACE_CREATED",
      userId,
      workspaceId,
      requestId,
      timestamp: Date.now(),
    });
  }

  public logWorkspaceSwitched(userId: string, fromId: string | null, toId: string, requestId: string): void {
    logger.info(`[AUDIT] Workspace Switched - UserID: ${userId} from ${fromId || "None"} to ${toId}`, {
      event: "WORKSPACE_SWITCHED",
      userId,
      fromId,
      toId,
      requestId,
      timestamp: Date.now(),
    });
  }

  public logMemberAdded(adminId: string, memberId: string, workspaceId: string, requestId: string): void {
    logger.info(`[AUDIT] Member Added - UserID: ${memberId} added to WorkspaceID: ${workspaceId} by AdminID: ${adminId}`, {
      event: "MEMBER_ADDED",
      adminId,
      memberId,
      workspaceId,
      requestId,
      timestamp: Date.now(),
    });
  }

  public logMemberRemoved(adminId: string, memberId: string, workspaceId: string, requestId: string): void {
    logger.info(`[AUDIT] Member Removed - UserID: ${memberId} removed from WorkspaceID: ${workspaceId} by AdminID: ${adminId}`, {
      event: "MEMBER_REMOVED",
      adminId,
      memberId,
      workspaceId,
      requestId,
      timestamp: Date.now(),
    });
  }

  public logRoleChanged(
    adminId: string,
    memberId: string,
    workspaceId: string,
    oldRole: string,
    newRole: string,
    requestId: string
  ): void {
    logger.info(
      `[AUDIT] Role Changed - UserID: ${memberId} in WorkspaceID: ${workspaceId} changed from ${oldRole} to ${newRole} by AdminID: ${adminId}`,
      {
        event: "ROLE_CHANGED",
        adminId,
        memberId,
        workspaceId,
        oldRole,
        newRole,
        requestId,
        timestamp: Date.now(),
      }
    );
  }

  public logPRDGenerated(
    userId: string,
    workspaceId: string,
    featureRequestId: string,
    prdId: string,
    version: number,
    requestId: string
  ): void {
    logger.info(
      `[AUDIT] PRD Generated - FeatureRequestID: ${featureRequestId}, PRDID: ${prdId}, Version: ${version} by UserID: ${userId}`,
      {
        event: "PRD_GENERATED",
        userId,
        workspaceId,
        featureRequestId,
        prdId,
        version,
        requestId,
        timestamp: Date.now(),
      }
    );
  }

  public logPRDRegenerated(
    userId: string,
    workspaceId: string,
    featureRequestId: string,
    prdId: string,
    oldVersion: number,
    newVersion: number,
    requestId: string
  ): void {
    logger.info(
      `[AUDIT] PRD Regenerated - FeatureRequestID: ${featureRequestId}, New PRDID: ${prdId}, Version: ${newVersion} (old: ${oldVersion}) by UserID: ${userId}`,
      {
        event: "PRD_REGENERATED",
        userId,
        workspaceId,
        featureRequestId,
        prdId,
        oldVersion,
        newVersion,
        requestId,
        timestamp: Date.now(),
      }
    );
  }
}

export const auditService = new AuditService();
