import { pgEnum } from "drizzle-orm/pg-core";

export const membershipRoleEnum = pgEnum("membership_role", ["OWNER", "ADMIN", "MEMBER"]);

export const featureRequestStatusEnum = pgEnum("feature_request_status", [
  "NEW",
  "CLARIFICATION_REQUIRED",
  "READY_FOR_PRD",
  "PRD_GENERATED",
  "IN_DEVELOPMENT",
  "IN_REVIEW",
  "READY_FOR_RELEASE",
  "SHIPPED",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
]);

export const pullRequestStatusEnum = pgEnum("pull_request_status", [
  "OPEN",
  "CHANGES_REQUESTED",
  "APPROVED",
  "MERGED",
]);

export const reviewSeverityEnum = pgEnum("review_severity", ["BLOCKING", "NON_BLOCKING"]);

export const releaseStatusEnum = pgEnum("release_status", ["PENDING", "APPROVED", "SHIPPED"]);

export const subscriptionPlanEnum = pgEnum("subscription_plan", ["FREE", "PRO", "TEAM"]);

export const featureRequestPriorityEnum = pgEnum("feature_request_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);

export const aiReviewStatusEnum = pgEnum("ai_review_status", [
  "PENDING",
  "COMPLETED",
  "FAILED",
]);

export const featureRequestSourceEnum = pgEnum("feature_request_source", [
  "MANUAL",
  "EMAIL",
  "API",
  "SUPPORT",
]);


