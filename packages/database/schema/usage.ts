import { pgTable, uuid, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const usageTable = pgTable(
  "usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    metric: varchar("metric", { length: 100 }).notNull(),
    quantity: integer("quantity").notNull(),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (table) => [
    index("usage_org_id_idx").on(table.organizationId),
    index("usage_metric_idx").on(table.metric),
  ]
);

export type SelectUsage = typeof usageTable.$inferSelect;
export type InsertUsage = typeof usageTable.$inferInsert;
