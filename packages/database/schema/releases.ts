import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { pullRequestsTable } from "./pull-requests";
import { usersTable } from "./users";
import { releaseStatusEnum } from "./enums";

export const releasesTable = pgTable(
  "releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    pullRequestId: uuid("pull_request_id")
      .references(() => pullRequestsTable.id, { onDelete: "restrict" })
      .notNull(),
    version: varchar("version", { length: 100 }).notNull(),
    status: releaseStatusEnum("status").default("NOT_READY").notNull(),

    // Ship lifecycle fields — populated atomically when status transitions to SHIPPED
    shippedAt: timestamp("shipped_at"),
    shippedBy: uuid("shipped_by")
      .references(() => usersTable.id, { onDelete: "set null" }),
    releaseVersion: varchar("release_version", { length: 100 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("releases_org_id_idx").on(table.organizationId),
    index("releases_pull_request_id_idx").on(table.pullRequestId),
    index("releases_status_idx").on(table.status),
  ]
);

export type SelectRelease = typeof releasesTable.$inferSelect;
export type InsertRelease = typeof releasesTable.$inferInsert;
