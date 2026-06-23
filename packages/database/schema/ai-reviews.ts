import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  integer,
  text,
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { pullRequestsTable } from "./pull-requests";
import { aiReviewStatusEnum, aiReviewRecommendationEnum } from "./enums";

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

    // Versioning — each regeneration bumps version; UNIQUE(pullRequestId, version) enforced below
    version: integer("version").notNull().default(1),

    // Status lifecycle
    status: aiReviewStatusEnum("status").default("PENDING").notNull(),

    // Aggregate scores (0–100)
    overallScore: real("overall_score"),
    prdScore: real("prd_score"),
    taskCoverageScore: real("task_coverage_score"),
    securityScore: real("security_score"),
    performanceScore: real("performance_score"),
    architectureScore: real("architecture_score"),

    // Review output
    summary: text("summary"),
    recommendation: aiReviewRecommendationEnum("recommendation"),

    // Provider metadata
    provider: varchar("provider", { length: 100 }),
    model: varchar("model", { length: 100 }),
    promptVersion: varchar("prompt_version", { length: 50 }),

    // Arbitrary structured metadata (prompt params, run context, etc.)
    metadata: jsonb("metadata"),

    // ── Legacy columns kept for backward compatibility ──────────────────────
    commitSha: varchar("commit_sha", { length: 40 }),
    score: integer("score"),
    tokensUsed: integer("tokens_used"),
    durationMs: integer("duration_ms"),
    // ────────────────────────────────────────────────────────────────────────

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
    index("ai_reviews_version_idx").on(table.version),
    // Enforce immutable review history: one row per (PR, version) pair
    uniqueIndex("ai_reviews_pull_request_id_version_uidx").on(
      table.pullRequestId,
      table.version
    ),
  ]
);

export type SelectAIReview = typeof aiReviewsTable.$inferSelect;
export type InsertAIReview = typeof aiReviewsTable.$inferInsert;
