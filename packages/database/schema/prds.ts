import { pgTable, uuid, text, integer, timestamp, jsonb, index, unique } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { featureRequestsTable } from "./feature-requests";

export const prdsTable = pgTable(
  "prds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    featureRequestId: uuid("feature_request_id")
      .references(() => featureRequestsTable.id, { onDelete: "cascade" })
      .notNull(),
    problemStatement: text("problem_statement").notNull(),
    goals: text("goals").array().notNull(),
    nonGoals: text("non_goals").array().notNull(),
    userStories: jsonb("user_stories").notNull(),
    acceptanceCriteria: text("acceptance_criteria").array().notNull(),
    edgeCases: text("edge_cases").array().notNull(),
    successMetrics: text("success_metrics").array().notNull(),
    content: jsonb("content").notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("prds_org_id_idx").on(table.organizationId),
    index("prds_feature_request_id_idx").on(table.featureRequestId),
    // Ensure each feature request has a unique version per workspace
    // Using featureRequestId as primary key ensures global uniqueness, but we add version uniqueness for safety
    // Note: featureRequestId is already unique, so using it with version suffices
    // This index prevents duplicate PRD versions for the same feature request
    // Unique constraint
    // drizzles syntax: unique([columns])
    // Using a raw index definition for uniqueness
    // We'll use the `unique` helper from drizzle-orm
    // Adding after existing indexes
    // Unique constraint on (featureRequestId, version)
    // Drizzle syntax: unique("prds_feature_request_version_uq").on(table.featureRequestId, table.version)
    // Add below:
    unique("prds_feature_request_version_uq").on(table.featureRequestId, table.version),
  ]
);

export type SelectPRD = typeof prdsTable.$inferSelect;
export type InsertPRD = typeof prdsTable.$inferInsert;
