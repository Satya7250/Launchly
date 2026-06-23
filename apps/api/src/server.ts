import express from "express";
import { logger } from "@repo/logger";
import cors from "cors";
import { auth } from "@repo/auth";
import { toNodeHandler } from "better-auth/node";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";
import { serve } from "inngest/express";
import { inngest, taskGenerationFunction, githubPullRequestReceivedFunction } from "@repo/inngest";
import { db, eq } from "@repo/database";
import { githubInstallationsTable, repositoriesTable, githubWebhookDeliveriesTable, githubSyncAuditsTable } from "@repo/database/schema";
import { verifyWebhookSignature } from "@repo/github";

import { env } from "./env";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Streamyst OpenAPI",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  }),
);

app.all("/api/auth/*any", toNodeHandler(auth));

app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [taskGenerationFunction, githubPullRequestReceivedFunction],
  })
);

app.get("/", (req, res) => {
  return res.json({ message: "Streamyst is up and running..." });
});

app.get("/health", (req, res) => {
  return res.json({ message: "Streamyst server is healthy", healthy: true });
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.post("/api/webhooks/github", async (req: any, res) => {
  const signature = req.headers["x-hub-signature-256"] as string;
  const deliveryId = req.headers["x-github-delivery"] as string;
  const eventType = req.headers["x-github-event"] as string;

  if (!signature || !deliveryId || !eventType) {
    return res.status(400).json({ error: "Missing required headers" });
  }

  const rawBodyText = req.rawBody ? req.rawBody.toString() : "";
  const isValid = await verifyWebhookSignature(rawBodyText, signature);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  try {
    const [existingDelivery] = await db
      .select()
      .from(githubWebhookDeliveriesTable)
      .where(eq(githubWebhookDeliveriesTable.id, deliveryId))
      .limit(1);

    if (existingDelivery) {
      return res.status(200).json({ message: "Duplicate event skipped", idempotent: true });
    }

    await db.insert(githubWebhookDeliveriesTable).values({
      id: deliveryId,
      eventType,
    });

    const payload = req.body;

    if (eventType === "installation") {
      const { action, installation } = payload;
      if (action === "created") {
        const instId = installation.id;
        const [existing] = await db
          .select()
          .from(githubInstallationsTable)
          .where(eq(githubInstallationsTable.installationId, instId))
          .limit(1);

        if (existing) {
          await db
            .update(githubInstallationsTable)
            .set({
              accountLogin: installation.account.login,
              accountType: installation.account.type,
              updatedAt: new Date(),
            })
            .where(eq(githubInstallationsTable.installationId, instId));

          await db.insert(githubSyncAuditsTable).values({
            organizationId: existing.organizationId,
            deliveryId,
            event: "installation.created",
            status: "COMPLETED",
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: 0,
          });
        }
      } else if (action === "deleted") {
        const instId = installation.id;
        const matchedInsts = await db
          .select()
          .from(githubInstallationsTable)
          .where(eq(githubInstallationsTable.installationId, instId));

        for (const inst of matchedInsts) {
          await db.insert(githubSyncAuditsTable).values({
            organizationId: inst.organizationId,
            deliveryId,
            event: "installation.deleted",
            status: "COMPLETED",
            startedAt: new Date(),
            completedAt: new Date(),
            durationMs: 0,
          });
        }

        await db
          .delete(githubInstallationsTable)
          .where(eq(githubInstallationsTable.installationId, instId));
      }
    } else if (eventType === "pull_request") {
      const { action, pull_request, repository, installation } = payload;
      if (["opened", "synchronize", "closed"].includes(action)) {
        const githubRepoId = repository.id;
        const instId = installation.id;

        const matchedRepos = await db
          .select()
          .from(repositoriesTable)
          .where(eq(repositoriesTable.githubRepoId, githubRepoId));

        if (matchedRepos.length > 0) {
          const events = [];
          for (const repo of matchedRepos) {
            const [auditRecord] = await db
              .insert(githubSyncAuditsTable)
              .values({
                organizationId: repo.organizationId,
                repositoryId: repo.id,
                deliveryId,
                event: `pull_request.${action}`,
                status: "RECEIVED",
              })
              .returning();

            events.push({
              name: "github.pull_request.received" as const,
              data: {
                workspaceId: repo.organizationId,
                repositoryId: repo.id,
                installationId: instId,
                pullRequestNumber: pull_request.number,
                githubPullRequestId: pull_request.id,
                action,
                auditId: auditRecord?.id,
              },
            });
          }

          await inngest.send(events);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error("Failed to process GitHub webhook", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

app.use(
  "/api",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
