import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { pullRequestsTable } from "./pull-requests";
import { releasesTable } from "./releases";
import { usersTable } from "./users";

/**
 * Immutable audit log for release ship events.
 *
 * Every successful `shipRelease()` call inserts one row here. Rows are never
 * updated or deleted — they form a tamper-evident chronological history of all
 * shipping actions for a given pull request / release.
 *
 * This table is intentionally separate from `release_approvals`, which records
 * human approval decisions (PENDING → APPROVED | REJECTED). Ship events are
 * deployment lifecycle events, not approval decisions.
 */
export const releaseShipAuditsTable = pgTable(
  "release_ship_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizationsTable.id, { onDelete: "cascade" })
      .notNull(),
    releaseId: uuid("release_id")
      .references(() => releasesTable.id, { onDelete: "restrict" })
      .notNull(),
    pullRequestId: uuid("pull_request_id")
      .references(() => pullRequestsTable.id, { onDelete: "restrict" })
      .notNull(),

    /** The user who triggered the ship action. */
    shippedBy: uuid("shipped_by")
      .references(() => usersTable.id, { onDelete: "set null" }),

    /** Optional human-readable release version tag (e.g. "v1.2.3"). */
    releaseVersion: varchar("release_version", { length: 100 }),

    /** Optional release notes captured at ship time. */
    notes: text("notes"),

    /** Immutable timestamp of when the ship action occurred. */
    shippedAt: timestamp("shipped_at").defaultNow().notNull(),
  },
  (table) => [
    index("release_ship_audits_org_id_idx").on(table.organizationId),
    index("release_ship_audits_release_id_idx").on(table.releaseId),
    index("release_ship_audits_pull_request_id_idx").on(table.pullRequestId),
    index("release_ship_audits_shipped_at_idx").on(table.shippedAt),
  ]
);

export type SelectReleaseShipAudit = typeof releaseShipAuditsTable.$inferSelect;
export type InsertReleaseShipAudit = typeof releaseShipAuditsTable.$inferInsert;
