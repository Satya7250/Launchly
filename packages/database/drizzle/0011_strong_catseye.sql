CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "release_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"review_id" uuid,
	"review_version" integer,
	"approved_by" uuid,
	"status" "approval_status" DEFAULT 'PENDING' NOT NULL,
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "releases" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "releases" ALTER COLUMN "status" SET DEFAULT 'NOT_READY'::text;--> statement-breakpoint
DROP TYPE "public"."release_status";--> statement-breakpoint
CREATE TYPE "public"."release_status" AS ENUM('NOT_READY', 'READY_FOR_APPROVAL', 'APPROVED', 'SHIPPED', 'REJECTED');--> statement-breakpoint
ALTER TABLE "releases" ALTER COLUMN "status" SET DEFAULT 'NOT_READY'::"public"."release_status";--> statement-breakpoint
ALTER TABLE "releases" ALTER COLUMN "status" SET DATA TYPE "public"."release_status" USING "status"::"public"."release_status";--> statement-breakpoint
ALTER TABLE "release_approvals" ADD CONSTRAINT "release_approvals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_approvals" ADD CONSTRAINT "release_approvals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_approvals" ADD CONSTRAINT "release_approvals_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_approvals" ADD CONSTRAINT "release_approvals_review_id_ai_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."ai_reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "release_approvals" ADD CONSTRAINT "release_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "release_approvals_org_id_idx" ON "release_approvals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "release_approvals_pull_request_id_idx" ON "release_approvals" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "release_approvals_status_idx" ON "release_approvals" USING btree ("status");