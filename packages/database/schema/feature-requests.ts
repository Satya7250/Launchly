import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { projectsTable } from "./projects";
import { usersTable } from "./users";
import { featureRequestStatusEnum, featureRequestPriorityEnum, featureRequestSourceEnum } from "./enums";

export const featureRequestsTable = pgTable(
  "feature_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projectsTable.id, { onDelete: "cascade" })
      .notNull(),
    createdByUserId: uuid("created_by_user_id")
      .references(() => usersTable.id, { onDelete: "set null" }),
    assignedToUserId: uuid("assigned_to_user_id")
      .references(() => usersTable.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    source: featureRequestSourceEnum("source").default("MANUAL").notNull(),
    status: featureRequestStatusEnum("status").default("NEW").notNull(),
    priority: featureRequestPriorityEnum("priority").default("MEDIUM").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("feature_requests_org_id_idx").on(table.organizationId).where(sql`deleted_at IS NULL`),
    index("feature_requests_project_id_idx").on(table.projectId).where(sql`deleted_at IS NULL`),
    index("feature_requests_status_idx").on(table.status),
    index("feature_requests_created_by_idx").on(table.createdByUserId),
    index("feature_requests_assigned_to_idx").on(table.assignedToUserId),
    index("feature_requests_priority_idx").on(table.priority),
  ]
);

export type SelectFeatureRequest = typeof featureRequestsTable.$inferSelect;
export type InsertFeatureRequest = typeof featureRequestsTable.$inferInsert;
