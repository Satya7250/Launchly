import { pgTable, uuid, varchar, integer, bigint, timestamp, index, unique } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { prdsTable } from "./prds";
import { pullRequestStatusEnum } from "./enums";

export const pullRequestsTable = pgTable(
  "pull_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    prdId: uuid("prd_id")
      .references(() => prdsTable.id, { onDelete: "restrict" })
      .notNull(),
    githubPrId: bigint("github_pr_id", { mode: "number" }).notNull(),
    number: integer("number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    branch: varchar("branch", { length: 255 }),
    baseBranch: varchar("base_branch", { length: 255 }),
    headSha: varchar("head_sha", { length: 40 }),
    mergedAt: timestamp("merged_at"),
    status: pullRequestStatusEnum("status").default("OPEN").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("pull_requests_org_id_idx").on(table.organizationId),
    index("pull_requests_prd_id_idx").on(table.prdId),
    index("pull_requests_status_idx").on(table.status),
    unique("pull_requests_org_pr_uq").on(table.organizationId, table.githubPrId),
  ]
);

export type SelectPullRequest = typeof pullRequestsTable.$inferSelect;
export type InsertPullRequest = typeof pullRequestsTable.$inferInsert;
