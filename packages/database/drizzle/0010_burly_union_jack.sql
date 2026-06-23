CREATE TYPE "public"."ai_finding_category" AS ENUM('SECURITY', 'PERFORMANCE', 'ARCHITECTURE', 'CORRECTNESS', 'STYLE', 'DOCUMENTATION', 'TEST_COVERAGE', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."ai_finding_severity" AS ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');--> statement-breakpoint
CREATE TYPE "public"."ai_review_recommendation" AS ENUM('APPROVE', 'REQUEST_CHANGES', 'COMMENT');--> statement-breakpoint
CREATE TABLE "ai_review_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"severity" "ai_finding_severity" NOT NULL,
	"category" "ai_finding_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"suggestion" text,
	"file_path" varchar(1024),
	"line_start" integer,
	"line_end" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_review_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid,
	"provider" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"prompt_version" varchar(50) NOT NULL,
	"idempotency_key" varchar(255),
	"prompt_hash" varchar(64),
	"response_hash" varchar(64),
	"token_usage" jsonb,
	"duration_ms" integer,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_reviews" ALTER COLUMN "commit_sha" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "overall_score" real;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "prd_score" real;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "task_coverage_score" real;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "security_score" real;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "performance_score" real;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "architecture_score" real;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "recommendation" "ai_review_recommendation";--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "provider" varchar(100);--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "prompt_version" varchar(50);--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "ai_review_findings" ADD CONSTRAINT "ai_review_findings_review_id_ai_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."ai_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_review_audits" ADD CONSTRAINT "ai_review_audits_review_id_ai_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."ai_reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_review_findings_review_id_idx" ON "ai_review_findings" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "ai_review_findings_severity_idx" ON "ai_review_findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "ai_review_findings_category_idx" ON "ai_review_findings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "ai_review_audits_review_id_idx" ON "ai_review_audits" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "ai_review_audits_idempotency_idx" ON "ai_review_audits" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "ai_review_audits_status_idx" ON "ai_review_audits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_review_audits_provider_idx" ON "ai_review_audits" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "ai_reviews_version_idx" ON "ai_reviews" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_reviews_pull_request_id_version_uidx" ON "ai_reviews" USING btree ("pull_request_id","version");