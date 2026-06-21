import { pgTable, uuid, varchar, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { pullRequestsTable } from "./pull-requests";

export const reviewHistoryTable = pgTable(
  "review_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    pullRequestId: uuid("pull_request_id")
      .references(() => pullRequestsTable.id, { onDelete: "cascade" })
      .notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    metadata: jsonb("metadata").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("review_history_org_id_idx").on(table.organizationId),
    index("review_history_pull_request_id_idx").on(table.pullRequestId),
  ]
);

export type SelectReviewHistory = typeof reviewHistoryTable.$inferSelect;
export type InsertReviewHistory = typeof reviewHistoryTable.$inferInsert;
