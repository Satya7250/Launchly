import { pgTable, uuid, varchar, timestamp, bigint, index, unique, boolean } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { projectsTable } from "./projects";
import { githubInstallationsTable } from "./github-installations";

export const repositoriesTable = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    githubInstallationId: uuid("github_installation_id")
      .references(() => githubInstallationsTable.id, { onDelete: "set null" }),
    name: varchar("name", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    githubRepoId: bigint("github_repo_id", { mode: "number" }).notNull(),
    owner: varchar("owner", { length: 255 }),
    defaultBranch: varchar("default_branch", { length: 255 }),
    private: boolean("private"),
    installationId: bigint("installation_id", { mode: "number" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("repositories_org_id_idx").on(table.organizationId),
    index("repositories_project_id_idx").on(table.projectId),
    index("repositories_github_inst_id_idx").on(table.githubInstallationId),
    unique("repositories_org_repo_uq").on(table.organizationId, table.githubRepoId),
  ]
);

export type SelectRepository = typeof repositoriesTable.$inferSelect;
export type InsertRepository = typeof repositoriesTable.$inferInsert;

