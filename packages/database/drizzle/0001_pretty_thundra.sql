CREATE TYPE "public"."feature_request_status" AS ENUM('NEW', 'CLARIFICATION_REQUIRED', 'READY_FOR_PRD', 'PRD_GENERATED', 'IN_DEVELOPMENT', 'IN_REVIEW', 'READY_FOR_RELEASE', 'SHIPPED');--> statement-breakpoint
CREATE TYPE "public"."membership_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."pull_request_status" AS ENUM('OPEN', 'CHANGES_REQUESTED', 'APPROVED', 'MERGED');--> statement-breakpoint
CREATE TYPE "public"."release_status" AS ENUM('PENDING', 'APPROVED', 'SHIPPED');--> statement-breakpoint
CREATE TYPE "public"."review_severity" AS ENUM('BLOCKING', 'NON_BLOCKING');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('FREE', 'PRO', 'TEAM');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" "membership_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_user_org_uq" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "github_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"installation_id" bigint NOT NULL,
	"account_login" varchar(255) NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "github_installations_installation_id_unique" UNIQUE("installation_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"github_installation_id" uuid,
	"name" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"github_repo_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_github_repo_id_unique" UNIQUE("github_repo_id")
);
--> statement-breakpoint
CREATE TABLE "feature_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"status" "feature_request_status" DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "prds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"feature_request_id" uuid NOT NULL,
	"problem_statement" text NOT NULL,
	"goals" text[] NOT NULL,
	"non_goals" text[] NOT NULL,
	"user_stories" jsonb NOT NULL,
	"acceptance_criteria" text[] NOT NULL,
	"edge_cases" text[] NOT NULL,
	"success_metrics" text[] NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engineering_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"prd_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'TODO' NOT NULL,
	"assignee_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pull_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"prd_id" uuid NOT NULL,
	"github_pr_id" bigint NOT NULL,
	"number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" "pull_request_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_requests_github_pr_id_unique" UNIQUE("github_pr_id")
);
--> statement-breakpoint
CREATE TABLE "ai_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"commit_sha" varchar(40) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"ai_review_id" uuid NOT NULL,
	"file_path" varchar(255) NOT NULL,
	"line_number" integer NOT NULL,
	"message" text NOT NULL,
	"severity" "review_severity" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"pull_request_id" uuid NOT NULL,
	"version" varchar(100) NOT NULL,
	"status" "release_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'FREE' NOT NULL,
	"status" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_subscription_id" varchar(255) NOT NULL,
	"provider_customer_id" varchar(255),
	"provider_plan_id" varchar(255),
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_provider_subscription_id_unique" UNIQUE("provider_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"metric" varchar(100) NOT NULL,
	"quantity" integer NOT NULL,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email_verified" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installations" ADD CONSTRAINT "github_installations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_github_installation_id_github_installations_id_fk" FOREIGN KEY ("github_installation_id") REFERENCES "public"."github_installations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prds" ADD CONSTRAINT "prds_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prds" ADD CONSTRAINT "prds_feature_request_id_feature_requests_id_fk" FOREIGN KEY ("feature_request_id") REFERENCES "public"."feature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_tasks" ADD CONSTRAINT "engineering_tasks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_tasks" ADD CONSTRAINT "engineering_tasks_prd_id_prds_id_fk" FOREIGN KEY ("prd_id") REFERENCES "public"."prds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engineering_tasks" ADD CONSTRAINT "engineering_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_prd_id_prds_id_fk" FOREIGN KEY ("prd_id") REFERENCES "public"."prds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_reviews" ADD CONSTRAINT "ai_reviews_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_issues" ADD CONSTRAINT "review_issues_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_issues" ADD CONSTRAINT "review_issues_ai_review_id_ai_reviews_id_fk" FOREIGN KEY ("ai_review_id") REFERENCES "public"."ai_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_history" ADD CONSTRAINT "review_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_history" ADD CONSTRAINT "review_history_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "releases" ADD CONSTRAINT "releases_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_user_id_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "memberships_org_id_idx" ON "memberships" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "github_installations_org_id_idx" ON "github_installations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "projects_org_id_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "repositories_org_id_idx" ON "repositories" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "repositories_project_id_idx" ON "repositories" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "repositories_github_inst_id_idx" ON "repositories" USING btree ("github_installation_id");--> statement-breakpoint
CREATE INDEX "feature_requests_org_id_idx" ON "feature_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "feature_requests_project_id_idx" ON "feature_requests" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "feature_requests_status_idx" ON "feature_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prds_org_id_idx" ON "prds" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "prds_feature_request_id_idx" ON "prds" USING btree ("feature_request_id");--> statement-breakpoint
CREATE INDEX "engineering_tasks_org_id_idx" ON "engineering_tasks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "engineering_tasks_prd_id_idx" ON "engineering_tasks" USING btree ("prd_id");--> statement-breakpoint
CREATE INDEX "engineering_tasks_status_idx" ON "engineering_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "engineering_tasks_assignee_id_idx" ON "engineering_tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "pull_requests_org_id_idx" ON "pull_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "pull_requests_prd_id_idx" ON "pull_requests" USING btree ("prd_id");--> statement-breakpoint
CREATE INDEX "pull_requests_status_idx" ON "pull_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_reviews_org_id_idx" ON "ai_reviews" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_reviews_pull_request_id_idx" ON "ai_reviews" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "review_issues_org_id_idx" ON "review_issues" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "review_issues_ai_review_id_idx" ON "review_issues" USING btree ("ai_review_id");--> statement-breakpoint
CREATE INDEX "review_issues_severity_idx" ON "review_issues" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "review_history_org_id_idx" ON "review_history" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "review_history_pull_request_id_idx" ON "review_history" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "releases_org_id_idx" ON "releases" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "releases_pull_request_id_idx" ON "releases" USING btree ("pull_request_id");--> statement-breakpoint
CREATE INDEX "releases_status_idx" ON "releases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_org_id_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_prov_sub_id_idx" ON "subscriptions" USING btree ("provider_subscription_id");--> statement-breakpoint
CREATE INDEX "usage_org_id_idx" ON "usage" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "usage_metric_idx" ON "usage" USING btree ("metric");