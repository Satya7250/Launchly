import { pgTable, uuid, timestamp, unique, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";
import { membershipRoleEnum } from "./enums";

export const membershipsTable = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    role: membershipRoleEnum("role").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("memberships_user_id_idx").on(table.userId),
    index("memberships_org_id_idx").on(table.organizationId),
    unique("memberships_user_org_uq").on(table.userId, table.organizationId),
  ]
);

export type SelectMembership = typeof membershipsTable.$inferSelect;
export type InsertMembership = typeof membershipsTable.$inferInsert;
