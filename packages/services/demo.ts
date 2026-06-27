import { db } from "@repo/database";
import {
  organizationsTable,
  membershipsTable,
  projectsTable,
  featureRequestsTable,
  prdsTable,
  engineeringTasksTable,
  githubInstallationsTable,
  repositoriesTable,
  pullRequestsTable,
  pullRequestFilesTable,
  githubSyncAuditsTable,
  taskGenerationAuditsTable,
} from "@repo/database/schema";
export class DemoService {
  public async seedDemoData(userId: string) {
    const timestamp = Date.now().toString().slice(-4);
    const orgName = `ShipFlow AI - Demo Workspace ${timestamp}`;
    const slug = `shipflow-demo-${timestamp}`;

    return await db.transaction(async (tx) => {
      // 1. Create Organization Workspace
      const [org] = await tx
        .insert(organizationsTable)
        .values({
          name: orgName,
          slug,
        })
        .returning();

      if (!org) {
        throw new Error("Failed to create demo organization");
      }

      // 2. Create Membership for active user
      await tx.insert(membershipsTable).values({
        userId,
        organizationId: org.id,
        role: "OWNER",
      });

      // 3. Create Project
      const [project] = await tx
        .insert(projectsTable)
        .values({
          organizationId: org.id,
          name: "ShipFlow AI Core Platform",
          description: "End-to-end requirement clarification, PRD generation, task breakdown, and automated PR reviews.",
        })
        .returning();

      if (!project) {
        throw new Error("Failed to create demo project");
      }

      // 4. Create Feature Request
      const [featureRequest] = await tx
        .insert(featureRequestsTable)
        .values({
          organizationId: org.id,
          projectId: project.id,
          createdByUserId: userId,
          assignedToUserId: userId,
          title: "Automated Pull Request Code Reviews",
          description: "Implement a background agent that parses incoming GitHub pull requests, performs structured code reviews via LLMs, and leaves review suggestions.",
          status: "READY_FOR_RELEASE",
          priority: "HIGH",
        })
        .returning();

      if (!featureRequest) {
        throw new Error("Failed to create demo feature request");
      }

      // 5. Create PRD

      const [prd] = await tx
        .insert(prdsTable)
        .values({
          organizationId: org.id,
          featureRequestId: featureRequest.id,
          problemStatement: "Manual code reviews take hours, causing development bottlenecks and delaying critical releases.",
          goals: ["Reduce review loop cycle times by 40%", "Automatically catches standard syntax and logical flaws"],
          nonGoals: ["Replacing senior developers' final signoffs and deployment reviews"],
          userStories: [
            { actor: "Software Developer", action: "Creates a pull request on GitHub", benefit: "Receive instant style and structure reviews in under two minutes" }
          ],
          acceptanceCriteria: ["All file updates are persisted in transactions", "Deliveries are audited and traceable"],
          edgeCases: ["PRs with 0 files changed", "Files with extremely long single-line diffs"],
          successMetrics: ["Developer throughput increase", "Pull request cycle time drop"],
          content: {
            title: "PRD - Automated Pull Request Code Reviews",
            executiveSummary: "Automate code reviews using AI, focusing on syntax, styles, edge cases, and architectural recommendations.",
            targetUsers: ["Software Engineers", "Tech Leads", "Code Reviewers"],
            functionalRequirements: [
              "Secure signature validation on incoming GitHub webhook events",
              "Idempotency checks to prevent double processing of identical webhooks",
              "Cascade-safe pull request metadata and file ingestion",
              "Interactive files list and detailed inline diff views in dashboard",
              "Lazy-loading of diff patches for files exceeding size thresholds (>20KB)",
            ],
            nonFunctionalRequirements: [
              "Webhook processing completes in under 100ms to stay within GitHub constraints",
              "High visual fidelity dashboard with dark mode aesthetics and micro-animations",
            ],
            risks: ["Exceeding GitHub API rate limits on very large PR branches"],
            assumptions: ["GitHub App configurations are valid"],
            problemStatement: "Manual code reviews take hours, causing development bottlenecks and delaying critical releases.",
            goals: ["Reduce review loop cycle times by 40%", "Automatically catches standard syntax and logical flaws"],
            nonGoals: ["Replacing senior developers' final signoffs and deployment reviews"],
            userStories: [
              { actor: "Software Developer", action: "Creates a pull request on GitHub", benefit: "Receive instant style and structure reviews in under two minutes" }
            ],
            acceptanceCriteria: ["All file updates are persisted in transactions", "Deliveries are audited and traceable"],
            edgeCases: ["PRs with 0 files changed", "Files with extremely long single-line diffs"],
            successMetrics: ["Developer throughput increase", "Pull request cycle time drop"],
          },
          version: 1,
        })
        .returning();

      if (!prd) {
        throw new Error("Failed to create demo PRD");
      }

      // 6. Create Engineering Tasks
      const tasksToInsert = [
        {
          organizationId: org.id,
          prdId: prd.id,
          projectId: project.id,
          title: "Setup GitHub App Portal & Permissions Manifest",
          description: "Register the Launchly App on GitHub, configure webhook callbacks, and request repository contents and pull request permissions.",
          status: "DONE" as const,
          position: 0,
          version: 1,
          metadata: { estimate: 2, complexity: "MEDIUM", priority: "HIGH", confidence: 0.95 },
        },
        {
          organizationId: org.id,
          prdId: prd.id,
          projectId: project.id,
          title: "Implement Signature HMAC Verification Middleware",
          description: "Preserve raw body text in Express request adapters and verify signature digest headers using HMAC-SHA256.",
          status: "DONE" as const,
          position: 1,
          version: 1,
          metadata: { estimate: 3, complexity: "MEDIUM", priority: "HIGH", confidence: 0.9 },
        },
        {
          organizationId: org.id,
          prdId: prd.id,
          projectId: project.id,
          title: "Implement Webhook Delivery Idempotency Caching",
          description: "Create a database schema to register X-GitHub-Delivery headers, skipping duplicate payloads immediately to prevent double processing.",
          status: "DONE" as const,
          position: 2,
          version: 1,
          metadata: { estimate: 1, complexity: "LOW", priority: "MEDIUM", confidence: 0.99 },
        },
        {
          organizationId: org.id,
          prdId: prd.id,
          projectId: project.id,
          title: "Build Webhook Auditing Tracker (github_sync_audits)",
          description: "Implement immutable logs tracking starts, completions, durations, retries, and errors for every incoming event webhook.",
          status: "DONE" as const,
          position: 3,
          version: 1,
          metadata: { estimate: 2, complexity: "LOW", priority: "MEDIUM", confidence: 0.98 },
        },
        {
          organizationId: org.id,
          prdId: prd.id,
          projectId: project.id,
          title: "Create Pull Request Ingestion Background Job",
          description: "Implement Inngest event subscriber to fetch branch metadata and changed files. Delete old records and bulk-save files safely.",
          status: "IN_PROGRESS" as const,
          position: 0,
          version: 1,
          metadata: { estimate: 4, complexity: "HIGH", priority: "HIGH", confidence: 0.85 },
        },
        {
          organizationId: org.id,
          prdId: prd.id,
          projectId: project.id,
          title: "Build On-Demand Lazy Patch Loader for Large Diffs",
          description: "Enforce a 20KB cap on saved file patches. Implement tRPC endpoint to fetch larger diff files dynamically from GitHub.",
          status: "TODO" as const,
          position: 0,
          version: 1,
          metadata: { estimate: 2, complexity: "MEDIUM", priority: "MEDIUM", confidence: 0.9 },
        },
        {
          organizationId: org.id,
          prdId: prd.id,
          projectId: project.id,
          title: "Design Frontend Pull Request File Diff Visualizer",
          description: "Build interactive workspace PR lists and detail views displaying additions, deletions, modified lists, and custom syntax code blocks.",
          status: "TODO" as const,
          position: 1,
          version: 1,
          metadata: { estimate: 3, complexity: "LOW", priority: "HIGH", confidence: 0.95 },
        },
        {
          organizationId: org.id,
          prdId: prd.id,
          projectId: project.id,
          title: "Create AI Prompt and Review Evaluation Specs",
          description: "Establish structured OpenAI response formats to analyze code diff blocks and post comments directly onto GitHub lines.",
          status: "BACKLOG" as const,
          position: 0,
          version: 1,
          metadata: { estimate: 3, complexity: "HIGH", priority: "CRITICAL", confidence: 0.8 },
        },
      ];

      for (const t of tasksToInsert) {
        await tx.insert(engineeringTasksTable).values(t);
      }

      // 7. Create GitHub Installation details
      const [installation] = await tx
        .insert(githubInstallationsTable)
        .values({
          organizationId: org.id,
          installationId: 888999,
          accountLogin: "acme-enterprise",
          accountType: "Organization",
        })
        .returning();

      if (!installation) {
        throw new Error("Failed to create demo installation");
      }

      // 8. Create Connected Repository
      const [repo] = await tx
        .insert(repositoriesTable)
        .values({
          organizationId: org.id,
          projectId: project.id,
          githubInstallationId: installation.id,
          installationId: 888999,
          name: "shipflow-ai-core",
          fullName: "acme-enterprise/shipflow-ai-core",
          githubRepoId: 999888,
          owner: "acme-enterprise",
          defaultBranch: "main",
          private: true,
        })
        .returning();

      if (!repo) {
        throw new Error("Failed to create demo repository");
      }

      // 9. Create Pull Request
      const [pullRequest] = await tx
        .insert(pullRequestsTable)
        .values({
          organizationId: org.id,
          prdId: prd.id,
          repositoryId: repo.id,
          githubPrId: 777666,
          number: 12,
          title: "PR #12: Feat/signature verification and webhook security",
          branch: "feat/signature-verification",
          baseBranch: "main",
          headSha: "4b7b25e796e625a66a1e5d7a8d8e9e1c2b3d4f5g",
          baseSha: "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t",
          state: "open",
          author: "octocat",
          url: "https://github.com/acme-enterprise/shipflow-ai-core/pull/12",
          status: "OPEN",
          processingStatus: "READY_FOR_AI_REVIEW",
        })
        .returning();

      if (!pullRequest) {
        throw new Error("Failed to create demo pull request");
      }

      // 10. Create Pull Request Files
      const filesToInsert = [
        {
          pullRequestId: pullRequest.id,
          filename: "apps/api/src/server.ts",
          status: "modified",
          additions: 15,
          deletions: 2,
          changes: 17,
          patch: "@@ -37,6 +37,15 @@\n app.use(\n   express.json({\n     verify: (req: any, _res, buf) => {\n       req.rawBody = buf;\n     },\n   })\n );\n+app.post(\"/api/webhooks/github\", async (req: any, res) => {\n+  const signature = req.headers[\"x-hub-signature-256\"] as string;\n+  const deliveryId = req.headers[\"x-github-delivery\"] as string;\n+  const isValid = await verifyWebhookSignature(req.rawBody.toString(), signature);\n+  if (!isValid) return res.status(401).json({ error: \"Invalid signature\" });\n+  return res.status(200).json({ success: true });\n+});",
        },
        {
          pullRequestId: pullRequest.id,
          filename: "packages/github/github-service.ts",
          status: "added",
          additions: 25,
          deletions: 0,
          changes: 25,
          patch: "@@ -0,0 +1,25 @@\n+import { App } from \"octokit\";\n+import { verify } from \"@octokit/webhooks-methods\";\n+import { env } from \"./env.js\";\n+export const githubApp = new App({\n+  appId: env.GITHUB_APP_ID,\n+  privateKey: env.GITHUB_PRIVATE_KEY,\n+});\n+export async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {\n+  return await verify(env.GITHUB_WEBHOOK_SECRET, payload, signature);\n+}",
        },
        {
          pullRequestId: pullRequest.id,
          filename: "packages/database/schema/github-sync-audits.ts",
          status: "added",
          additions: 350,
          deletions: 0,
          changes: 350,
          patch: null, // Large file simulations lazy load this patch dynamically!
        },
      ];

      for (const f of filesToInsert) {
        await tx.insert(pullRequestFilesTable).values(f);
      }

      // 11. Create mock webhook sync audit logs
      const syncStarted = new Date(Date.now() - 3600 * 1000);
      const syncCompleted = new Date(syncStarted.getTime() + 1450);
      await tx.insert(githubSyncAuditsTable).values({
        organizationId: org.id,
        repositoryId: repo.id,
        pullRequestId: pullRequest.id,
        deliveryId: "del-uuid-8888-9999",
        event: "pull_request.synchronize",
        status: "COMPLETED",
        startedAt: syncStarted,
        completedAt: syncCompleted,
        durationMs: 1450,
        retryCount: 0,
      });

      // 12. Create mock task generation audit logs
      const genStarted = new Date(Date.now() - 7200 * 1000);
      const genCompleted = new Date(genStarted.getTime() + 2300);
      await tx.insert(taskGenerationAuditsTable).values({
        organizationId: org.id,
        prdId: prd.id,
        provider: "mock",
        model: "mock",
        promptVersion: "v1",
        promptHash: "prompt-hash-1111",
        responseHash: "response-hash-2222",
        temperature: 0.2,
        status: "COMPLETED",
        idempotencyKey: "idem-key-3333",
        generatedVersion: 1,
        startedAt: genStarted,
        completedAt: genCompleted,
        durationMs: 2300,
        tokenUsage: { promptTokens: 450, completionTokens: 1200, totalTokens: 1650 },
      });

      return org;
    });
  }
}

export const demoService = new DemoService();
