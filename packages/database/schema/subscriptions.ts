import { pgTable, uuid, varchar, timestamp, index, unique } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { subscriptionPlanEnum } from "./enums";

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    plan: subscriptionPlanEnum("plan").default("FREE").notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // e.g. "RAZORPAY"
    providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }).notNull(),
    providerCustomerId: varchar("provider_customer_id", { length: 255 }),
    providerPlanId: varchar("provider_plan_id", { length: 255 }),
    currentPeriodEnd: timestamp("current_period_end"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("subscriptions_org_id_idx").on(table.organizationId),
    index("subscriptions_prov_sub_id_idx").on(table.providerSubscriptionId),
    unique("subscriptions_org_prov_sub_uq").on(table.organizationId, table.providerSubscriptionId),
  ]
);

export type SelectSubscription = typeof subscriptionsTable.$inferSelect;
export type InsertSubscription = typeof subscriptionsTable.$inferInsert;
