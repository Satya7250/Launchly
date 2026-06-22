ALTER TYPE "public"."task_status" ADD VALUE 'BACKLOG' BEFORE 'TODO';--> statement-breakpoint
ALTER TABLE "engineering_tasks" ADD COLUMN "project_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "engineering_tasks" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "engineering_tasks" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "engineering_tasks" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "engineering_tasks" ADD CONSTRAINT "engineering_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "engineering_tasks_project_id_idx" ON "engineering_tasks" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "prds" ADD CONSTRAINT "prds_feature_request_version_uq" UNIQUE("feature_request_id","version");