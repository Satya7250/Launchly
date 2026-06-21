CREATE TYPE "public"."ai_review_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."feature_request_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "github_installations" DROP CONSTRAINT "github_installations_installation_id_unique";--> statement-breakpoint
ALTER TABLE "repositories" DROP CONSTRAINT "repositories_github_repo_id_unique";--> statement-breakpoint
ALTER TABLE "pull_requests" DROP CONSTRAINT "pull_requests_github_pr_id_unique";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_provider_subscription_id_unique";--> statement-breakpoint
ALTER TABLE "repositories" DROP CONSTRAINT "repositories_github_installation_id_github_installations_id_fk";
--> statement-breakpoint
ALTER TABLE "pull_requests" DROP CONSTRAINT "pull_requests_prd_id_prds_id_fk";
--> statement-breakpoint
ALTER TABLE "releases" DROP CONSTRAINT "releases_pull_request_id_pull_requests_id_fk";
--> statement-breakpoint
DROP INDEX "projects_org_id_idx";--> statement-breakpoint
DROP INDEX "feature_requests_org_id_idx";--> statement-breakpoint
DROP INDEX "feature_requests_project_id_idx";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD COLUMN "assigned_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD COLUMN "priority" "feature_request_priority" DEFAULT 'MEDIUM' NOT NULL;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "branch" varchar(255);--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "base_branch" varchar(255);--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "head_sha" varchar(40);--> statement-breakpoint
ALTER TABLE "pull_requests" ADD COLUMN "merged_at" timestamp;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "status" "ai_review_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "model" varchar(100);--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "tokens_used" integer;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "review_issues" ADD COLUMN "rule" varchar(100);--> statement-breakpoint
ALTER TABLE "review_issues" ADD COLUMN "suggestion" text;--> statement-breakpoint
ALTER TABLE "review_issues" ADD COLUMN "resolved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "review_issues" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_github_installation_id_github_installations_id_fk" FOREIGN KEY ("github_installation_id") REFERENCES "public"."github_installations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_prd_id_prds_id_fk" FOREIGN KEY ("prd_id") REFERENCES "public"."prds"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq_idx" ON "users" USING btree ("email") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "feature_requests_created_by_idx" ON "feature_requests" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "feature_requests_assigned_to_idx" ON "feature_requests" USING btree ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX "feature_requests_priority_idx" ON "feature_requests" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "ai_reviews_status_idx" ON "ai_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "review_issues_resolved_idx" ON "review_issues" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "projects_org_id_idx" ON "projects" USING btree ("organization_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "feature_requests_org_id_idx" ON "feature_requests" USING btree ("organization_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "feature_requests_project_id_idx" ON "feature_requests" USING btree ("project_id") WHERE deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_org_inst_uq" UNIQUE("organization_id","installation_id");--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_org_repo_uq" UNIQUE("organization_id","github_repo_id");--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_org_pr_uq" UNIQUE("organization_id","github_pr_id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_prov_sub_uq" UNIQUE("organization_id","provider_subscription_id");