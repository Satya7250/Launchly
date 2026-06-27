import { db, eq, desc, and } from "@repo/database";
import { organizationsTable, prdsTable, featureRequestsTable, taskGenerationAuditsTable, engineeringTasksTable } from "@repo/database/schema";
import { randomUUID } from "node:crypto";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("\n=== E2E TEST: Task Generation Pipeline ===\n");

  // 1. Find the demo organization
  const [org] = await db.select().from(organizationsTable).limit(1);
  if (!org) {
    console.error("✗ No organization found");
    process.exit(1);
  }
  const workspaceId = org.id;
  console.log(`[DB] Org: ${org.name} (${workspaceId})`);

  // 2. Find a PRD
  const [prd] = await db
    .select()
    .from(prdsTable)
    .where(eq(prdsTable.organizationId, workspaceId))
    .limit(1);

  if (!prd) {
    console.error("✗ No PRD found");
    process.exit(1);
  }
  const prdId = prd.id;
  console.log(`[DB] PRD: ${prdId} (v${prd.version})`);

  // 3. Find the feature request
  const [fr] = await db
    .select()
    .from(featureRequestsTable)
    .where(eq(featureRequestsTable.id, prd.featureRequestId))
    .limit(1);

  if (!fr) {
    console.error("✗ No feature request found");
    process.exit(1);
  }
  console.log(`[DB] Feature Request: ${fr.title} (project: ${fr.projectId})`);

  // 4. Check existing audits and clean up
  const audits = await db
    .select()
    .from(taskGenerationAuditsTable)
    .where(eq(taskGenerationAuditsTable.prdId, prdId))
    .orderBy(desc(taskGenerationAuditsTable.startedAt));

  console.log(`[DB] Existing audits: ${audits.length}`);
  for (const a of audits) {
    console.log(`  - ${a.id}: status=${a.status}`);
  }

  const latestAudit = audits[0];
  if (latestAudit && (latestAudit.status === "COMPLETED" || latestAudit.status === "QUEUED" || latestAudit.status === "GENERATING")) {
    console.log(`\n[DB] Marking existing ${latestAudit.status} audit as FAILED...`);
    await db
      .update(taskGenerationAuditsTable)
      .set({ status: "FAILED", error: "Invalidated for E2E test", updatedAt: new Date() })
      .where(eq(taskGenerationAuditsTable.id, latestAudit.id));
    console.log(`[DB] Done`);
  }

  // 5. Delete existing tasks for clean test
  const existingTasks = await db
    .select({ id: engineeringTasksTable.id })
    .from(engineeringTasksTable)
    .where(eq(engineeringTasksTable.prdId, prdId));
  console.log(`\n[DB] Existing tasks: ${existingTasks.length}`);
  if (existingTasks.length > 0) {
    console.log(`[DB] Deleting tasks...`);
    await db.delete(engineeringTasksTable).where(eq(engineeringTasksTable.prdId, prdId));
    console.log(`[DB] Done`);
  }

  // 6. Insert audit record with QUEUED status
  const generationId = randomUUID();
  await db.insert(taskGenerationAuditsTable).values({
    id: generationId,
    organizationId: workspaceId,
    prdId: prdId,
    provider: "openai",
    model: "gpt-4o-mini",
    promptVersion: "v1",
    status: "QUEUED",
    startedAt: new Date(),
  });
  console.log(`\n[DB] Created QUEUED audit: ${generationId}`);

  // 7. Send event directly to Inngest Dev Server
  console.log(`\n[TEST] Sending event to Inngest Dev Server...`);
  const eventPayload = {
    name: "task.generate",
    data: {
      workspaceId,
      prdId,
      projectId: fr.projectId,
      generationId,
    },
  };

  try {
    const response = await fetch("http://localhost:8288/e/NO_EVENT_KEY_SET", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([eventPayload]),
    });
    const text = await response.text();
    console.log(`[INNGEST] Dev Server response: ${response.status} ${text}`);
  } catch (err) {
    console.error(`[TEST] ✗ Failed to reach Inngest Dev Server: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // 8. Poll for status changes
  console.log(`\n[POLL] Watching for status changes (max 120s, every 3s)...`);
  const startTime = Date.now();
  const maxWait = 120_000;
  let lastStatus = "";

  while (Date.now() - startTime < maxWait) {
    await sleep(3000);

    const [audit] = await db
      .select()
      .from(taskGenerationAuditsTable)
      .where(eq(taskGenerationAuditsTable.id, generationId))
      .limit(1);

    if (!audit) {
      console.log(`[POLL] No audit record yet...`);
      continue;
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    if (audit.status !== lastStatus) {
      console.log(`[${elapsed}s] Status → ${audit.status}`);
      lastStatus = audit.status;
    }

    if (audit.status === "COMPLETED") {
      const tasks = await db
        .select()
        .from(engineeringTasksTable)
        .where(eq(engineeringTasksTable.prdId, prdId));

      console.log(`\n✓ SUCCESS! Generation completed!`);
      console.log(`  Duration: ${audit.durationMs}ms`);
      console.log(`  Version: ${audit.generatedVersion}`);
      console.log(`  Token usage: ${JSON.stringify(audit.tokenUsage)}`);
      console.log(`  Tasks created: ${tasks.length}`);
      for (const t of tasks) {
        console.log(`    - [${t.status}] ${t.title}`);
      }
      console.log(`\n=== E2E TEST PASSED ===`);
      process.exit(0);
    }

    if (audit.status === "FAILED") {
      console.log(`\n✗ FAILED! Error: ${audit.error}`);
      console.log(`  Duration: ${audit.durationMs}ms`);
      process.exit(1);
    }

    if (audit.status === "QUEUED" && elapsed > 30) {
      // Check Inngest service health
      try {
        const resp = await fetch("http://localhost:8288");
        const health = resp.status === 200 ? "healthy" : `status=${resp.status}`;
        console.log(`[INNGEST] Dev Server: ${health}`);
      } catch {
        console.log(`[INNGEST] Dev Server NOT reachable!`);
      }
      try {
        const resp = await fetch("http://localhost:8000/api/inngest");
        const json = await resp.json() as Record<string, unknown>;
        console.log(`[API] Serve: fn_count=${json.function_count}, mode=${json.mode}`);
      } catch {
        console.log(`[API] Serve NOT reachable!`);
      }
    }

    if (audit.status === "GENERATING" && elapsed > 120) {
      console.log(`[POLL] Generating for over 2 minutes - might be hung`);
    }
  }

  console.log(`\n✗ TIMEOUT after ${maxWait / 1000}s`);
  process.exit(1);
}

main().catch((err) => {
  console.error("Unhandled:", err);
  process.exit(1);
});
