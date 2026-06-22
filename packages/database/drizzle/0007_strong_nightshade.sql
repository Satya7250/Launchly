ALTER TABLE "task_generation_audits" ADD COLUMN "prompt_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "task_generation_audits" ADD COLUMN "response_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "task_generation_audits" ADD COLUMN "temperature" real;--> statement-breakpoint
ALTER TABLE "task_generation_audits" ADD COLUMN "idempotency_key" varchar(255);--> statement-breakpoint
ALTER TABLE "task_generation_audits" ADD COLUMN "generated_version" integer;--> statement-breakpoint
CREATE INDEX "task_generation_audits_idempotency_idx" ON "task_generation_audits" USING btree ("idempotency_key");