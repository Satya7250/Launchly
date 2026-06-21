import { pgTable, uuid, varchar, timestamp, index, integer, text } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { pullRequestsTable } from "./pull-requests";
import { aiReviewStatusEnum } from "./enums";

export const aiReviewsTable = pgTable(
  "ai_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    pullRequestId: uuid("pull_request_id")
      .references(() => pullRequestsTable.id, { onDelete: "cascade" })
      .notNull(),
    commitSha: varchar("commit_sha", { length: 40 }).notNull(),
    status: aiReviewStatusEnum("status").default("PENDING").notNull(),
    score: integer("score"),
    summary: text("summary"),
    model: varchar("model", { length: 100 }),
    tokensUsed: integer("tokens_used"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("ai_reviews_org_id_idx").on(table.organizationId),
    index("ai_reviews_pull_request_id_idx").on(table.pullRequestId),
    index("ai_reviews_status_idx").on(table.status),
  ]
);

export type SelectAIReview = typeof aiReviewsTable.$inferSelect;
export type InsertAIReview = typeof aiReviewsTable.$inferInsert;
