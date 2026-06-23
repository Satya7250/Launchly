import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const githubWebhookDeliveriesTable = pgTable("github_webhook_deliveries", {
  id: varchar("id", { length: 255 }).primaryKey(),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
});

export type SelectGithubWebhookDelivery = typeof githubWebhookDeliveriesTable.$inferSelect;
export type InsertGithubWebhookDelivery = typeof githubWebhookDeliveriesTable.$inferInsert;
