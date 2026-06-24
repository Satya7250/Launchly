-- Phase 6: Ship Workflow — Additive Migration
-- Adds ship tracking columns to `releases` and creates the dedicated
-- `release_ship_audits` immutable audit table.
--
-- This migration is ADDITIVE ONLY:
--   - No tables are dropped
--   - No columns are dropped
--   - No existing enum values are removed
--   - No existing constraints are altered
--   - No data is modified
--   - Existing rows remain valid (new columns are nullable)

--> statement-breakpoint

-- 1. Add ship lifecycle columns to the releases table
ALTER TABLE "releases" ADD COLUMN "shipped_at" timestamp;
--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "shipped_by" uuid;
--> statement-breakpoint
ALTER TABLE "releases" ADD COLUMN "release_version" varchar(100);
--> statement-breakpoint

-- 2. Add FK constraint for shipped_by → users
ALTER TABLE "releases" ADD CONSTRAINT "releases_shipped_by_users_id_fk"
  FOREIGN KEY ("shipped_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- 3. Create the dedicated immutable ship audit table
CREATE TABLE "release_ship_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"release_id" uuid NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"shipped_by" uuid,
	"release_version" varchar(100),
	"notes" text,
	"shipped_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- 4. Foreign key constraints for release_ship_audits
ALTER TABLE "release_ship_audits" ADD CONSTRAINT "release_ship_audits_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "release_ship_audits" ADD CONSTRAINT "release_ship_audits_release_id_releases_id_fk"
  FOREIGN KEY ("release_id") REFERENCES "public"."releases"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "release_ship_audits" ADD CONSTRAINT "release_ship_audits_pull_request_id_pull_requests_id_fk"
  FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "release_ship_audits" ADD CONSTRAINT "release_ship_audits_shipped_by_users_id_fk"
  FOREIGN KEY ("shipped_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- 5. Indexes for efficient lookup
CREATE INDEX "release_ship_audits_org_id_idx" ON "release_ship_audits" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "release_ship_audits_release_id_idx" ON "release_ship_audits" USING btree ("release_id");
--> statement-breakpoint
CREATE INDEX "release_ship_audits_pull_request_id_idx" ON "release_ship_audits" USING btree ("pull_request_id");
--> statement-breakpoint
CREATE INDEX "release_ship_audits_shipped_at_idx" ON "release_ship_audits" USING btree ("shipped_at");
