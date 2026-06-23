import { pgTable, uuid, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { repositoriesTable } from "./repositories";
import { pullRequestsTable } from "./pull-requests";

export const githubSyncAuditsTable = pgTable(
  "github_sync_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    repositoryId: uuid("repository_id")
      .references(() => repositoriesTable.id, { onDelete: "cascade" }),
    pullRequestId: uuid("pull_request_id")
      .references(() => pullRequestsTable.id, { onDelete: "set null" }),
    deliveryId: varchar("delivery_id", { length: 255 }).notNull(),
    event: varchar("event", { length: 100 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(), // RECEIVED, PROCESSING, COMPLETED, FAILED
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    retryCount: integer("retry_count").default(0).notNull(),
    error: varchar("error", { length: 2048 }),
  },
  (table) => [
    index("github_sync_audits_org_id_idx").on(table.organizationId),
    index("github_sync_audits_repo_id_idx").on(table.repositoryId),
    index("github_sync_audits_pr_id_idx").on(table.pullRequestId),
    index("github_sync_audits_delivery_id_idx").on(table.deliveryId),
  ]
);

export type SelectGithubSyncAudit = typeof githubSyncAuditsTable.$inferSelect;
export type InsertGithubSyncAudit = typeof githubSyncAuditsTable.$inferInsert;
