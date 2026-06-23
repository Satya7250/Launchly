import { inngest, taskGenerateEvent, githubPullRequestReceivedEvent } from "./client.js";
import { db, eq, and, desc, sql } from "@repo/database";
import { prdsTable, engineeringTasksTable, taskGenerationAuditsTable, pullRequestsTable, pullRequestFilesTable, repositoriesTable, githubSyncAuditsTable } from "@repo/database/schema";
import { getPRDProvider } from "@repo/ai";
import { TaskStatus, TaskAiMetadata } from "@repo/shared";
import { createHash } from "node:crypto";
import { getPullRequest, getPullRequestFiles } from "@repo/github";

export const taskGenerationFunction = inngest.createFunction(
  {
    id: "task-generation",
    name: "AI Task Generation",
    triggers: [taskGenerateEvent],
  },
  async ({ event, step }) => {
    const { workspaceId, prdId, projectId, generationId } = event.data;

    // 1. Resolve or create audit generationId
    const resolvedGenId = await step.run("resolve-generation-id", async () => {
      if (generationId) {
        return generationId;
      }

      const [latest] = await db
        .select()
        .from(taskGenerationAuditsTable)
        .where(
          and(
            eq(taskGenerationAuditsTable.organizationId, workspaceId),
            eq(taskGenerationAuditsTable.prdId, prdId),
            eq(taskGenerationAuditsTable.status, "QUEUED")
          )
        )
        .orderBy(desc(taskGenerationAuditsTable.startedAt))
        .limit(1);

      if (latest) {
        return latest.id;
      }

      const newId = globalThis.crypto ? globalThis.crypto.randomUUID() : require("node:crypto").randomUUID();
      const useMock = process.env.MOCK_AI === 'true';
      await db.insert(taskGenerationAuditsTable).values({
        id: newId,
        organizationId: workspaceId,
        prdId: prdId,
        provider: useMock ? "mock" : "openai",
        model: useMock ? "mock" : "gpt-4o-mini",
        promptVersion: "v1",
        status: "QUEUED",
        startedAt: new Date(),
      });
      return newId;
    });

    // 2. Check for idempotency (if already completed, skip generation and return result)
    const idempotencyResult = await step.run("check-idempotency", async () => {
      const [existing] = await db
        .select()
        .from(taskGenerationAuditsTable)
        .where(eq(taskGenerationAuditsTable.id, resolvedGenId))
        .limit(1);

      if (existing && existing.status === "COMPLETED") {
        const countResult = existing.generatedVersion ? await db
          .select({ count: sql<number>`count(*)` })
          .from(engineeringTasksTable)
          .where(
            and(
              eq(engineeringTasksTable.prdId, prdId),
              eq(engineeringTasksTable.organizationId, workspaceId),
              eq(engineeringTasksTable.version, existing.generatedVersion)
            )
          )
          .then((rows) => Number(rows[0]?.count ?? 0)) : 0;

        return {
          alreadyCompleted: true,
          tasksCount: countResult,
          version: existing.generatedVersion ?? 1,
        };
      }
      return {
        alreadyCompleted: false,
        tasksCount: 0,
        version: 0,
      };
    });

    if (idempotencyResult.alreadyCompleted) {
      return {
        success: true,
        tasksCount: idempotencyResult.tasksCount,
        version: idempotencyResult.version,
        idempotent: true,
      };
    }

    // 3. Transition status to GENERATING
    await step.run("transition-to-generating", async () => {
      await db
        .update(taskGenerationAuditsTable)
        .set({
          status: "GENERATING",
          updatedAt: new Date(),
        })
        .where(eq(taskGenerationAuditsTable.id, resolvedGenId));
    });

    const functionStartedAt = new Date();

    try {
      // 4. Fetch PRD
      const prd = await step.run("fetch-prd", async () => {
        const [row] = await db
          .select()
          .from(prdsTable)
          .where(
            and(
              eq(prdsTable.id, prdId),
              eq(prdsTable.organizationId, workspaceId)
            )
          )
          .limit(1);
        
        if (!row) {
          throw new Error(`PRD with ID ${prdId} not found in workspace ${workspaceId}`);
        }
        return row;
      });

      // 5. Fetch latest version number for tasks under this PRD
      const nextVersion = await step.run("get-next-version", async () => {
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

        return (result[0]?.version ?? 0) + 1;
      });

      // 6. Call AI provider to generate tasks and compute hashes
      const aiResult = await step.run("generate-tasks", async () => {
        // Re-construct the full PRD object combining properties
        const prdObject = {
          title: (prd.content as any)?.title || "Feature PRD",
          executiveSummary: (prd.content as any)?.executiveSummary || "",
          targetUsers: (prd.content as any)?.targetUsers || [],
          functionalRequirements: (prd.content as any)?.functionalRequirements || [],
          nonFunctionalRequirements: (prd.content as any)?.nonFunctionalRequirements || [],
          risks: (prd.content as any)?.risks || [],
          assumptions: (prd.content as any)?.assumptions || [],
          problemStatement: prd.problemStatement,
          goals: prd.goals,
          nonGoals: prd.nonGoals,
          userStories: prd.userStories as any[],
          acceptanceCriteria: prd.acceptanceCriteria,
          edgeCases: prd.edgeCases,
          successMetrics: prd.successMetrics,
        };

        const promptText = JSON.stringify(prdObject);
        const promptHash = createHash("sha256").update(promptText).digest("hex");

        const provider = getPRDProvider();
        const response = await provider.generateTasks(prdObject);

        const responseText = JSON.stringify(response.tasks);
        const responseHash = createHash("sha256").update(responseText).digest("hex");

        return {
          tasks: response.tasks,
          usage: response.usage,
          promptHash,
          responseHash,
        };
      });

      // 7. Save tasks to DB
      await step.run("save-tasks", async () => {
        await db.transaction(async (tx) => {
          let position = 0;
          for (const task of aiResult.tasks) {
            const taskMetadata: TaskAiMetadata = {
              estimate: task.estimate,
              complexity: task.complexity as "LOW" | "MEDIUM" | "HIGH",
              dependencies: task.dependencies,
              priority: task.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
              confidence: task.confidence,
            };

            await tx.insert(engineeringTasksTable).values({
              organizationId: workspaceId,
              prdId: prdId,
              projectId: projectId,
              title: task.title,
              description: task.description,
              status: "TODO" as TaskStatus,
              position,
              version: nextVersion,
              metadata: taskMetadata,
            });

            position++;
          }
        });
      });

      // 8. Transition status to COMPLETED and save tokenUsage, duration, hashes, and version
      await step.run("transition-to-completed", async () => {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - functionStartedAt.getTime();

        await db
          .update(taskGenerationAuditsTable)
          .set({
            status: "COMPLETED",
            completedAt,
            durationMs,
            tokenUsage: aiResult.usage || null,
            promptHash: aiResult.promptHash,
            responseHash: aiResult.responseHash,
            temperature: 0.2,
            generatedVersion: nextVersion,
            updatedAt: new Date(),
          })
          .where(eq(taskGenerationAuditsTable.id, resolvedGenId));
      });

      return {
        success: true,
        tasksCount: aiResult.tasks.length,
        version: nextVersion,
      };
    } catch (error: any) {
      // 9. Transition status to FAILED and record error message
      await step.run("transition-to-failed", async () => {
        const completedAt = new Date();
        const durationMs = completedAt.getTime() - functionStartedAt.getTime();

        await db
          .update(taskGenerationAuditsTable)
          .set({
            status: "FAILED",
            completedAt,
            durationMs,
            error: error?.message || String(error),
            updatedAt: new Date(),
          })
          .where(eq(taskGenerationAuditsTable.id, resolvedGenId));
      });
      // Re-throw so Inngest registers the failure/retry
      throw error;
    }
  }
);

export const githubPullRequestReceivedFunction = inngest.createFunction(
  {
    id: "github-pull-request-received",
    name: "GitHub Pull Request Received",
    triggers: [githubPullRequestReceivedEvent],
  },
  async ({ event, step, attempt }) => {
    const { workspaceId, repositoryId, installationId, pullRequestNumber, githubPullRequestId, action, auditId } = event.data;
    const functionStartedAt = new Date();

    // 1. Fetch Repository details from database to verify and get owner/name
    const repoRecord = await step.run("fetch-repo-details", async () => {
      const [repo] = await db
          .select()
          .from(repositoriesTable)
          .where(
              and(
                  eq(repositoriesTable.id, repositoryId),
                  eq(repositoriesTable.organizationId, workspaceId)
              )
          )
          .limit(1);

      if (!repo) {
        throw new Error(`Repository ${repositoryId} not found in workspace ${workspaceId}`);
      }
      return repo;
    });

    // 2. Initialize/Upsert PR record in database as "RECEIVED"
    const prId = await step.run("initialize-pr", async () => {
      // Check if PR already exists in this workspace
      const [existing] = await db
          .select()
          .from(pullRequestsTable)
          .where(
              and(
                  eq(pullRequestsTable.organizationId, workspaceId),
                  eq(pullRequestsTable.githubPrId, githubPullRequestId)
              )
          )
          .limit(1);

      if (existing) {
        // Update its processing status to PROCESSING
        await db
            .update(pullRequestsTable)
            .set({
              processingStatus: "PROCESSING",
              updatedAt: new Date(),
            })
            .where(eq(pullRequestsTable.id, existing.id));
        return existing.id;
      }

      // Create new PR record
      const [inserted] = await db
          .insert(pullRequestsTable)
          .values({
            organizationId: workspaceId,
            repositoryId: repositoryId,
            githubPrId: githubPullRequestId,
            number: pullRequestNumber,
            title: `PR #${pullRequestNumber}`, // temporary title
            state: action === "closed" ? "closed" : "open",
            author: "unknown", // temporary
            url: `https://github.com/${repoRecord.fullName}/pull/${pullRequestNumber}`,
            processingStatus: "PROCESSING",
          })
          .returning();

      if (!inserted) {
        throw new Error("Failed to initialize pull request in database");
      }
      return inserted.id;
    });

    // Update audit record to PROCESSING status
    if (auditId) {
      await step.run("update-audit-processing", async () => {
        await db
            .update(githubSyncAuditsTable)
            .set({
              status: "PROCESSING",
              pullRequestId: prId,
              retryCount: attempt,
            })
            .where(eq(githubSyncAuditsTable.id, auditId));
      });
    }

    try {
      // 3. Fetch PR Details from GitHub
      const prDetails = await step.run("fetch-pr-from-github", async () => {
        const fullNameParts = repoRecord.fullName.split("/");
        const owner = fullNameParts[0];
        const repoName = fullNameParts[1];
        if (!owner || !repoName) {
          throw new Error(`Invalid repository full name: ${repoRecord.fullName}`);
        }
        return await getPullRequest(installationId, owner, repoName, pullRequestNumber);
      });

      // 4. Fetch PR Files from GitHub
      const prFiles = await step.run("fetch-files-from-github", async () => {
        const fullNameParts = repoRecord.fullName.split("/");
        const owner = fullNameParts[0];
        const repoName = fullNameParts[1];
        if (!owner || !repoName) {
          throw new Error(`Invalid repository full name: ${repoRecord.fullName}`);
        }
        return await getPullRequestFiles(installationId, owner, repoName, pullRequestNumber);
      });

      // 5. Update PR record with complete details
      await step.run("update-pr-details", async () => {
        let state: string = prDetails.state;
        if (prDetails.merged) {
          state = "merged";
        }

        let status: "OPEN" | "CHANGES_REQUESTED" | "APPROVED" | "MERGED" = "OPEN";
        if (prDetails.merged) {
          status = "MERGED";
        }

        await db
            .update(pullRequestsTable)
            .set({
              title: prDetails.title || `PR #${pullRequestNumber}`,
              state: state,
              author: prDetails.user?.login || "unknown",
              branch: prDetails.head.ref,
              baseBranch: prDetails.base.ref,
              headSha: prDetails.head.sha,
              baseSha: prDetails.base.sha,
              url: prDetails.html_url,
              mergedAt: prDetails.merged_at ? new Date(prDetails.merged_at) : null,
              status: status,
              updatedAt: new Date(),
            })
            .where(eq(pullRequestsTable.id, prId));
      });

      // 6. Persist Files details inside database transaction
      await step.run("persist-files", async () => {
        await db.transaction(async (tx) => {
          // Delete existing files
          await tx
              .delete(pullRequestFilesTable)
              .where(eq(pullRequestFilesTable.pullRequestId, prId));

          // Bulk insert files
          if (prFiles.length > 0) {
            // For files > 20KB (20000 chars) patch is null
            const filesToInsert = prFiles.map((file: any) => {
              const patchText = file.patch || null;
              const isTooLarge = patchText && patchText.length > 20000;
              return {
                pullRequestId: prId,
                filename: file.filename,
                status: file.status, // added, modified, removed
                additions: file.additions,
                deletions: file.deletions,
                changes: file.changes,
                patch: isTooLarge ? null : patchText,
              };
            });

            // Split into chunks of 100 to avoid query parameter limit in postgres
            const chunkSize = 100;
            for (let i = 0; i < filesToInsert.length; i += chunkSize) {
              const chunk = filesToInsert.slice(i, i + chunkSize);
              await tx.insert(pullRequestFilesTable).values(chunk);
            }
          }
        });
      });

      // 7. Update PR processing status to READY_FOR_AI_REVIEW
      await step.run("transition-to-ready", async () => {
        await db
            .update(pullRequestsTable)
            .set({
              processingStatus: "READY_FOR_AI_REVIEW",
              updatedAt: new Date(),
            })
            .where(eq(pullRequestsTable.id, prId));
      });

      // Update audit record to COMPLETED status
      if (auditId) {
        await step.run("update-audit-completed", async () => {
          const completedAt = new Date();
          const durationMs = completedAt.getTime() - functionStartedAt.getTime();
          await db
              .update(githubSyncAuditsTable)
              .set({
                status: "COMPLETED",
                completedAt,
                durationMs,
                retryCount: attempt,
              })
              .where(eq(githubSyncAuditsTable.id, auditId));
        });
      }

      // 8. Emit processed event
      await step.sendEvent("emit-processed-event", {
        name: "github.pull_request.processed",
        data: {
          workspaceId,
          repositoryId,
          pullRequestId: prId,
          pullRequestNumber,
        },
      });

      return {
        success: true,
        pullRequestId: prId,
        filesCount: prFiles.length,
      };

    } catch (error: any) {
      // Update status to FAILED in case of error
      await step.run("transition-to-failed", async () => {
        await db
            .update(pullRequestsTable)
            .set({
              processingStatus: "FAILED",
              updatedAt: new Date(),
            })
            .where(eq(pullRequestsTable.id, prId));
      });

      // Update audit record to FAILED status
      if (auditId) {
        await step.run("update-audit-failed", async () => {
          const completedAt = new Date();
          const durationMs = completedAt.getTime() - functionStartedAt.getTime();
          await db
              .update(githubSyncAuditsTable)
              .set({
                status: "FAILED",
                completedAt,
                durationMs,
                retryCount: attempt,
                error: error?.message || String(error),
              })
              .where(eq(githubSyncAuditsTable.id, auditId));
        });
      }

      throw error;
    }
  }
);
