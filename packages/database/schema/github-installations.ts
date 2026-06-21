import { pgTable, uuid, varchar, timestamp, bigint, index, unique } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const githubInstallationsTable = pgTable(
  "github_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    installationId: bigint("installation_id", { mode: "number" }).notNull(),
    accountLogin: varchar("account_login", { length: 255 }).notNull(),
    accountType: varchar("account_type", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("github_installations_org_id_idx").on(table.organizationId),
    unique("github_installations_org_inst_uq").on(table.organizationId, table.installationId),
  ]
);

export type SelectGithubInstallation = typeof githubInstallationsTable.$inferSelect;
export type InsertGithubInstallation = typeof githubInstallationsTable.$inferInsert;
