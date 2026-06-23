CREATE TYPE "public"."pull_request_processing_status" AS ENUM('RECEIVED', 'PROCESSING', 'READY_FOR_AI_REVIEW', 'FAILED');--> statement-breakpoint
CREATE TABLE "pull_request_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"filename" varchar(512) NOT NULL,
	"status" varchar(50) NOT NULL,
	"additions" integer NOT NULL,
	"deletions" integer NOT NULL,
	"changes" integer NOT NULL,
	"patch" text
);
--> statement-breakpoint
CREATE TABLE "github_webhook_deliveries" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repositories" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_requests" ALTER COLUMN "prd_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "owner" varchar(255);--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "default_branch" varchar(255);--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "private" boolean;--> statement-breakpoint
ALTER TABLE "repositories" ADD COLUMN "installation_id" bigint;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "repository_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "base_sha" varchar(40);--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "state" varchar(50) DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "author" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "url" varchar(512) NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "processing_status" "pull_request_processing_status" DEFAULT 'RECEIVED' NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_request_files" ADD CONSTRAINT "pull_request_files_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pull_request_files_pr_id_idx" ON "pull_request_files" USING btree ("pull_request_id");--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pull_requests_repository_id_idx" ON "pull_requests" USING btree ("repository_id");--> statement-breakpoint
CREATE INDEX "pull_requests_processing_status_idx" ON "pull_requests" USING btree ("processing_status");