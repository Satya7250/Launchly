import { Inngest, eventType } from "inngest";
import { z } from "zod";
import { env } from "./env.js";

export const taskGenerateEvent = eventType("task.generate", {
  schema: z.object({
    workspaceId: z.string().uuid(),
    prdId: z.string().uuid(),
    projectId: z.string().uuid(),
    generationId: z.string().uuid().optional(),
  }),
});

export const githubPullRequestReceivedEvent = eventType("github.pull_request.received", {
  schema: z.object({
    workspaceId: z.string().uuid(),
    repositoryId: z.string().uuid(),
    installationId: z.number(),
    pullRequestNumber: z.number(),
    githubPullRequestId: z.number(),
    action: z.string(),
    auditId: z.string().uuid().optional(),
  }),
});

export const inngest = new Inngest({
  id: "launchly",
  eventKey: env.INNGEST_EVENT_KEY,
});

