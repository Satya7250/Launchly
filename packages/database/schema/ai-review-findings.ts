import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { aiReviewsTable } from "./ai-reviews";
import { aiFindingSeverityEnum, aiFindingCategoryEnum } from "./enums";

export const aiReviewFindingsTable = pgTable(
  "ai_review_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Parent review
    reviewId: uuid("review_id")
      .references(() => aiReviewsTable.id, { onDelete: "cascade" })
      .notNull(),

    // Classification
    severity: aiFindingSeverityEnum("severity").notNull(),
    category: aiFindingCategoryEnum("category").notNull(),

    // Content
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    suggestion: text("suggestion"),

    // Code location (optional — some findings are file-level or PR-level)
    filePath: varchar("file_path", { length: 1024 }),
    lineStart: integer("line_start"),
    lineEnd: integer("line_end"),

    // Arbitrary extra data (e.g. diff context, rule refs)
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_review_findings_review_id_idx").on(table.reviewId),
    index("ai_review_findings_severity_idx").on(table.severity),
    index("ai_review_findings_category_idx").on(table.category),
  ]
);

export type SelectAIReviewFinding = typeof aiReviewFindingsTable.$inferSelect;
export type InsertAIReviewFinding = typeof aiReviewFindingsTable.$inferInsert;
