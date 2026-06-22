CREATE TYPE "public"."task_generation_status" AS ENUM('NOT_STARTED', 'QUEUED', 'GENERATING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "task_generation_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"prd_id" uuid NOT NULL,
	"provider" varchar(255) NOT NULL,
	"model" varchar(255) NOT NULL,
	"prompt_version" varchar(255) NOT NULL,
	"status" "task_generation_status" NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"duration_ms" integer,
	"token_usage" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_generation_audits" ADD CONSTRAINT "task_generation_audits_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_generation_audits" ADD CONSTRAINT "task_generation_audits_prd_id_prds_id_fk" FOREIGN KEY ("prd_id") REFERENCES "public"."prds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_generation_audits_org_id_idx" ON "task_generation_audits" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "task_generation_audits_prd_id_idx" ON "task_generation_audits" USING btree ("prd_id");--> statement-breakpoint
CREATE INDEX "task_generation_audits_status_idx" ON "task_generation_audits" USING btree ("status");