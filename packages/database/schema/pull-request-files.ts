import { pgTable, uuid, varchar, integer, text, index } from "drizzle-orm/pg-core";
import { pullRequestsTable } from "./pull-requests";

export const pullRequestFilesTable = pgTable(
  "pull_request_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pullRequestId: uuid("pull_request_id")
      .references(() => pullRequestsTable.id, { onDelete: "cascade" })
      .notNull(),
    filename: varchar("filename", { length: 512 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(), // added, modified, removed
    additions: integer("additions").notNull(),
    deletions: integer("deletions").notNull(),
    changes: integer("changes").notNull(),
    patch: text("patch"),
  },
  (table) => [
    index("pull_request_files_pr_id_idx").on(table.pullRequestId),
  ]
);

export type SelectPullRequestFile = typeof pullRequestFilesTable.$inferSelect;
export type InsertPullRequestFile = typeof pullRequestFilesTable.$inferInsert;
