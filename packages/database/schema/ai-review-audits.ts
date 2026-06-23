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

export const aiReviewAuditsTable = pgTable(
  "ai_review_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Link to the review that was generated (nullable: audit may be recorded before review row exists)
    reviewId: uuid("review_id").references(() => aiReviewsTable.id, {
      onDelete: "set null",
    }),

    // Provider / model info
    provider: varchar("provider", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    promptVersion: varchar("prompt_version", { length: 50 }).notNull(),

    // Deduplication & traceability
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    promptHash: varchar("prompt_hash", { length: 64 }),
    responseHash: varchar("response_hash", { length: 64 }),

    // Performance metrics
    tokenUsage: jsonb("token_usage"),   // { prompt: number, completion: number, total: number }
    durationMs: integer("duration_ms"),
    retryCount: integer("retry_count").default(0).notNull(),

    // Outcome
    status: varchar("status", { length: 50 }).notNull(), // STARTED | COMPLETED | FAILED
    error: text("error"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("ai_review_audits_review_id_idx").on(table.reviewId),
    index("ai_review_audits_idempotency_idx").on(table.idempotencyKey),
    index("ai_review_audits_status_idx").on(table.status),
    index("ai_review_audits_provider_idx").on(table.provider),
  ]
);

export type SelectAIReviewAudit = typeof aiReviewAuditsTable.$inferSelect;
export type InsertAIReviewAudit = typeof aiReviewAuditsTable.$inferInsert;
