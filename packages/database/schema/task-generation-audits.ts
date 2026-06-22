import { pgTable, uuid, varchar, text, timestamp, index, integer, jsonb, real } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { prdsTable } from "./prds";
import { taskGenerationStatusEnum } from "./enums";

export const taskGenerationAuditsTable = pgTable(
  "task_generation_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    prdId: uuid("prd_id")
      .references(() => prdsTable.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    model: varchar("model", { length: 255 }).notNull(),
    promptVersion: varchar("prompt_version", { length: 255 }).notNull(),
    promptHash: varchar("prompt_hash", { length: 255 }),
    responseHash: varchar("response_hash", { length: 255 }),
    temperature: real("temperature"),
    status: taskGenerationStatusEnum("status").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    generatedVersion: integer("generated_version"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
    tokenUsage: jsonb("token_usage"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("task_generation_audits_org_id_idx").on(table.organizationId),
    index("task_generation_audits_prd_id_idx").on(table.prdId),
    index("task_generation_audits_status_idx").on(table.status),
    index("task_generation_audits_idempotency_idx").on(table.idempotencyKey),
  ]
);

export type SelectTaskGenerationAudit = typeof taskGenerationAuditsTable.$inferSelect;
export type InsertTaskGenerationAudit = typeof taskGenerationAuditsTable.$inferInsert;
