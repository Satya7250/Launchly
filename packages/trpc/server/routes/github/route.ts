import { z } from "zod";
import { workspaceProcedure, router, createResponse } from "../../trpc.js";
import { db, eq, and, desc, sql } from "@repo/database";
import {
  githubInstallationsTable,
  repositoriesTable,
  pullRequestsTable,
  pullRequestFilesTable,
} from "@repo/database/schema";
import {
  getInstallationDetails,
  getInstallationRepositories,
  getPullRequestDiff,
} from "@repo/github";

export const githubRouter = router({
  // Connect a repository to the workspace (and register installation if needed)
  connect: workspaceProcedure
    .input(
      z.object({
        installationId: z.number(),
        githubRepositoryId: z.number(),
        owner: z.string(),
        name: z.string(),
        defaultBranch: z.string(),
        private: z.boolean(),
        projectId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const workspaceId = ctx.workspace.active.id;

      // 1. Verify/register installation for this workspace
      let installation = await db
        .select()
        .from(githubInstallationsTable)
        .where(
          and(
            eq(githubInstallationsTable.organizationId, workspaceId),
            eq(githubInstallationsTable.installationId, input.installationId)
          )
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (!installation) {
        // Fetch installation details from GitHub to populate model
        const details = await getInstallationDetails(input.installationId);
        const account = details.account as any;
        const [newInst] = await db
          .insert(githubInstallationsTable)
          .values({
            organizationId: workspaceId,
            installationId: input.installationId,
            accountLogin: account?.login || input.owner,
            accountType: account?.type || "User",
          })
          .returning();
        
        if (!newInst) {
          throw new Error("Failed to register github installation");
        }
        installation = newInst;
      }

      // 2. Connect the repository
      const [existingRepo] = await db
        .select()
        .from(repositoriesTable)
        .where(
          and(
            eq(repositoriesTable.organizationId, workspaceId),
            eq(repositoriesTable.githubRepoId, input.githubRepositoryId)
          )
        )
        .limit(1);

      if (existingRepo) {
        // Update details if it already exists
        const [updatedRepo] = await db
          .update(repositoriesTable)
          .set({
            projectId: input.projectId || existingRepo.projectId,
            githubInstallationId: installation.id,
            installationId: input.installationId,
            name: input.name,
            fullName: `${input.owner}/${input.name}`,
            owner: input.owner,
            defaultBranch: input.defaultBranch,
            private: input.private,
            updatedAt: new Date(),
          })
          .where(eq(repositoriesTable.id, existingRepo.id))
          .returning();
        
        return createResponse(updatedRepo, ctx);
      }

      // Insert new connected repository
      const [newRepo] = await db
        .insert(repositoriesTable)
        .values({
          organizationId: workspaceId,
          projectId: input.projectId || null,
          githubInstallationId: installation.id,
          installationId: input.installationId,
          githubRepoId: input.githubRepositoryId,
          name: input.name,
          fullName: `${input.owner}/${input.name}`,
          owner: input.owner,
          defaultBranch: input.defaultBranch,
          private: input.private,
        })
        .returning();

      return createResponse(newRepo, ctx);
    }),

  // Get connected and available repositories
  repositories: workspaceProcedure
    .input(
      z.object({
        fetchAvailableForInstallationId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const workspaceId = ctx.workspace.active.id;

      // Fetch connected repositories
      const connected = await db
        .select()
        .from(repositoriesTable)
        .where(eq(repositoriesTable.organizationId, workspaceId))
        .orderBy(repositoriesTable.name);

      // Optionally fetch available repositories from GitHub installation
      let available: any[] = [];
      if (input.fetchAvailableForInstallationId) {
        // Verify installation belongs to active workspace first
        const [installation] = await db
          .select()
          .from(githubInstallationsTable)
          .where(
            and(
              eq(githubInstallationsTable.organizationId, workspaceId),
              eq(githubInstallationsTable.installationId, input.fetchAvailableForInstallationId)
            )
          )
          .limit(1);

        if (!installation) {
          throw new Error("Installation access denied or not connected to workspace");
        }

        const ghRepos = await getInstallationRepositories(input.fetchAvailableForInstallationId);
        available = ghRepos.map((repo: any) => ({
          githubRepositoryId: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner.login,
          defaultBranch: repo.default_branch,
          private: repo.private,
          installationId: input.fetchAvailableForInstallationId,
        }));
      }

      // Also get all installations registered in workspace to display connection selector
      const installations = await db
        .select()
        .from(githubInstallationsTable)
        .where(eq(githubInstallationsTable.organizationId, workspaceId));

      return createResponse(
        {
          connected,
          available,
          installations,
        },
        ctx
      );
    }),

  // Paginated pull request tracker
  pullRequests: workspaceProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),
        repositoryId: z.string().uuid().optional(),
        processingStatus: z.enum(["RECEIVED", "PROCESSING", "READY_FOR_AI_REVIEW", "FAILED"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const workspaceId = ctx.workspace.active.id;
      const offset = (input.page - 1) * input.limit;

      const conditions = [eq(pullRequestsTable.organizationId, workspaceId)];
      if (input.repositoryId) {
        conditions.push(eq(pullRequestsTable.repositoryId, input.repositoryId));
      }
      if (input.processingStatus) {
        conditions.push(eq(pullRequestsTable.processingStatus, input.processingStatus));
      }

      const whereClause = and(...conditions);

      // Get count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(pullRequestsTable)
        .where(whereClause);
      const totalCount = Number(countResult?.count ?? 0);

      // Get items with repository name
      const items = await db
        .select({
          pullRequest: pullRequestsTable,
          repositoryName: repositoriesTable.name,
          repositoryFullName: repositoriesTable.fullName,
        })
        .from(pullRequestsTable)
        .innerJoin(repositoriesTable, eq(pullRequestsTable.repositoryId, repositoriesTable.id))
        .where(whereClause)
        .orderBy(desc(pullRequestsTable.createdAt))
        .limit(input.limit)
        .offset(offset);

      return createResponse(
        {
          items,
          pagination: {
            page: input.page,
            limit: input.limit,
            totalCount,
            totalPages: Math.ceil(totalCount / input.limit),
          },
        },
        ctx
      );
    }),

  // Get single PR with files
  pullRequestById: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const workspaceId = ctx.workspace.active.id;

      // 1. Fetch Pull Request details
      const [record] = await db
        .select({
          pullRequest: pullRequestsTable,
          repository: repositoriesTable,
        })
        .from(pullRequestsTable)
        .innerJoin(repositoriesTable, eq(pullRequestsTable.repositoryId, repositoriesTable.id))
        .where(
          and(
            eq(pullRequestsTable.id, input.id),
            eq(pullRequestsTable.organizationId, workspaceId)
          )
        )
        .limit(1);

      if (!record) {
        throw new Error("Pull request not found or workspace access denied");
      }

      // 2. Fetch associated files
      const files = await db
        .select()
        .from(pullRequestFilesTable)
        .where(eq(pullRequestFilesTable.pullRequestId, input.id))
        .orderBy(pullRequestFilesTable.filename);

      return createResponse(
        {
          pullRequest: record.pullRequest,
          repository: record.repository,
          files,
        },
        ctx
      );
    }),

  // On-demand raw diff fetching for large patches or full PR diff views
  pullRequestDiff: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const workspaceId = ctx.workspace.active.id;

      const [record] = await db
        .select({
          pullRequest: pullRequestsTable,
          repository: repositoriesTable,
        })
        .from(pullRequestsTable)
        .innerJoin(repositoriesTable, eq(pullRequestsTable.repositoryId, repositoriesTable.id))
        .where(
          and(
            eq(pullRequestsTable.id, input.id),
            eq(pullRequestsTable.organizationId, workspaceId)
          )
        )
        .limit(1);

      if (!record) {
        throw new Error("Pull request not found");
      }

      const fullNameParts = record.repository.fullName.split("/");
      const owner = fullNameParts[0];
      const repo = fullNameParts[1];
      if (!owner || !repo) {
        throw new Error("Invalid repository path");
      }

      if (!record.repository.installationId) {
        throw new Error("No installation associated with repository");
      }

      const diff = await getPullRequestDiff(
        record.repository.installationId,
        owner,
        repo,
        record.pullRequest.number
      );

      return createResponse({ diff }, ctx);
    }),
});
