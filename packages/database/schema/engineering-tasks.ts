import { pgTable, uuid, varchar, text, timestamp, index, integer, jsonb } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { prdsTable } from "./prds";
import { usersTable } from "./users";
import { projectsTable } from "./projects";
import { taskStatusEnum } from "./enums";

export const engineeringTasksTable = pgTable(
  "engineering_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    prdId: uuid("prd_id")
      .references(() => prdsTable.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projectsTable.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("TODO").notNull(),
    assigneeId: uuid("assignee_id")
      .references(() => usersTable.id, { onDelete: "set null" }),
    position: integer("position").default(0).notNull(),
    version: integer("version").default(1).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("engineering_tasks_org_id_idx").on(table.organizationId),
    index("engineering_tasks_prd_id_idx").on(table.prdId),
    index("engineering_tasks_project_id_idx").on(table.projectId),
    index("engineering_tasks_status_idx").on(table.status),
    index("engineering_tasks_assignee_id_idx").on(table.assigneeId),
  ]
);

export type SelectEngineeringTask = typeof engineeringTasksTable.$inferSelect;
export type InsertEngineeringTask = typeof engineeringTasksTable.$inferInsert;
