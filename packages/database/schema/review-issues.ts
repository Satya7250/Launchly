import { pgTable, uuid, varchar, integer, text, timestamp, index, boolean } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { aiReviewsTable } from "./ai-reviews";
import { reviewSeverityEnum } from "./enums";

export const reviewIssuesTable = pgTable(
  "review_issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    aiReviewId: uuid("ai_review_id")
      .references(() => aiReviewsTable.id, { onDelete: "cascade" })
      .notNull(),
    filePath: varchar("file_path", { length: 255 }).notNull(),
    lineNumber: integer("line_number").notNull(),
    message: text("message").notNull(),
    severity: reviewSeverityEnum("severity").notNull(),
    rule: varchar("rule", { length: 100 }),
    suggestion: text("suggestion"),
    resolved: boolean("resolved").default(false).notNull(),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("review_issues_org_id_idx").on(table.organizationId),
    index("review_issues_ai_review_id_idx").on(table.aiReviewId),
    index("review_issues_severity_idx").on(table.severity),
    index("review_issues_resolved_idx").on(table.resolved),
  ]
);

export type SelectReviewIssue = typeof reviewIssuesTable.$inferSelect;
export type InsertReviewIssue = typeof reviewIssuesTable.$inferInsert;
