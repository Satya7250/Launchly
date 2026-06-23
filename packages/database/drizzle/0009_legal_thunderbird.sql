ALTER TYPE "public"."pull_request_processing_status" ADD VALUE 'AI_REVIEWING';--> statement-breakpoint
ALTER TYPE "public"."pull_request_processing_status" ADD VALUE 'AI_REVIEW_COMPLETED';--> statement-breakpoint
ALTER TYPE "public"."pull_request_processing_status" ADD VALUE 'HUMAN_APPROVED';--> statement-breakpoint
ALTER TYPE "public"."pull_request_processing_status" ADD VALUE 'SHIPPED';--> statement-breakpoint
CREATE TABLE "github_sync_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"repository_id" uuid,
	"pull_request_id" uuid,
	"delivery_id" varchar(255) NOT NULL,
	"event" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error" varchar(2048)
);
--> statement-breakpoint
ALTER TABLE "github_sync_audits" ADD CONSTRAINT "github_sync_audits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_sync_audits" ADD CONSTRAINT "github_sync_audits_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_sync_audits" ADD CONSTRAINT "github_sync_audits_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_sync_audits_org_id_idx" ON "github_sync_audits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "github_sync_audits_repo_id_idx" ON "github_sync_audits" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "github_sync_audits_pr_id_idx" ON "github_sync_audits" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "github_sync_audits_delivery_id_idx" ON "github_sync_audits" USING btree ("delivery_id");