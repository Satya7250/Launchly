import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { projectsTable } from "./projects";
import { pullRequestsTable } from "./pull-requests";
import { aiReviewsTable } from "./ai-reviews";
import { usersTable } from "./users";
import { approvalStatusEnum } from "./enums";

export const releaseApprovalsTable = pgTable(
  "release_approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projectsTable.id, { onDelete: "cascade" })
      .notNull(),
    pullRequestId: uuid("pull_request_id")
      .references(() => pullRequestsTable.id, { onDelete: "cascade" })
      .notNull(),
    reviewId: uuid("review_id")
      .references(() => aiReviewsTable.id, { onDelete: "set null" }),
    reviewVersion: integer("review_version"),
    approvedBy: uuid("approved_by")
      .references(() => usersTable.id, { onDelete: "set null" }),
    status: approvalStatusEnum("status").default("PENDING").notNull(),
    comments: text("comments"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("release_approvals_org_id_idx").on(table.organizationId),
    index("release_approvals_pull_request_id_idx").on(table.pullRequestId),
    index("release_approvals_status_idx").on(table.status),
  ]
);

export type SelectReleaseApproval = typeof releaseApprovalsTable.$inferSelect;
export type InsertReleaseApproval = typeof releaseApprovalsTable.$inferInsert;
