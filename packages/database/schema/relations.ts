import { relations } from "drizzle-orm";
import { organizationsTable } from "./organizations";
import { usersTable, sessionsTable, accountsTable } from "./users";
import { membershipsTable } from "./memberships";
import { githubInstallationsTable } from "./github-installations";
import { projectsTable } from "./projects";
import { repositoriesTable } from "./repositories";
import { featureRequestsTable } from "./feature-requests";
import { prdsTable } from "./prds";
import { engineeringTasksTable } from "./engineering-tasks";
import { pullRequestsTable } from "./pull-requests";
import { aiReviewsTable } from "./ai-reviews";
import { reviewIssuesTable } from "./review-issues";
import { reviewHistoryTable } from "./review-history";
import { releasesTable } from "./releases";
import { subscriptionsTable } from "./subscriptions";
import { usageTable } from "./usage";

export const organizationsRelations = relations(organizationsTable, ({ many, one }) => ({
  memberships: many(membershipsTable),
  githubInstallations: many(githubInstallationsTable),
  projects: many(projectsTable),
  repositories: many(repositoriesTable),
  featureRequests: many(featureRequestsTable),
  prds: many(prdsTable),
  engineeringTasks: many(engineeringTasksTable),
  pullRequests: many(pullRequestsTable),
  aiReviews: many(aiReviewsTable),
  reviewIssues: many(reviewIssuesTable),
  reviewHistory: many(reviewHistoryTable),
  releases: many(releasesTable),
  subscription: one(subscriptionsTable),
  usages: many(usageTable),
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
  memberships: many(membershipsTable),
  assignedTasks: many(engineeringTasksTable),
  sessions: many(sessionsTable),
  accounts: many(accountsTable),
  createdFeatureRequests: many(featureRequestsTable, { relationName: "creator" }),
  assignedFeatureRequests: many(featureRequestsTable, { relationName: "assignee" }),
}));

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
}));

export const accountsRelations = relations(accountsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [accountsTable.userId],
    references: [usersTable.id],
  }),
}));

export const membershipsRelations = relations(membershipsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [membershipsTable.userId],
    references: [usersTable.id],
  }),
  organization: one(organizationsTable, {
    fields: [membershipsTable.organizationId],
    references: [organizationsTable.id],
  }),
}));

export const githubInstallationsRelations = relations(githubInstallationsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [githubInstallationsTable.organizationId],
    references: [organizationsTable.id],
  }),
  repositories: many(repositoriesTable),
}));

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [projectsTable.organizationId],
    references: [organizationsTable.id],
  }),
  repositories: many(repositoriesTable),
  featureRequests: many(featureRequestsTable),
}));

export const repositoriesRelations = relations(repositoriesTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [repositoriesTable.organizationId],
    references: [organizationsTable.id],
  }),
  project: one(projectsTable, {
    fields: [repositoriesTable.projectId],
    references: [projectsTable.id],
  }),
  githubInstallation: one(githubInstallationsTable, {
    fields: [repositoriesTable.githubInstallationId],
    references: [githubInstallationsTable.id],
  }),
}));

export const featureRequestsRelations = relations(featureRequestsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [featureRequestsTable.organizationId],
    references: [organizationsTable.id],
  }),
  project: one(projectsTable, {
    fields: [featureRequestsTable.projectId],
    references: [projectsTable.id],
  }),
  creator: one(usersTable, {
    fields: [featureRequestsTable.createdByUserId],
    references: [usersTable.id],
    relationName: "creator",
  }),
  assignee: one(usersTable, {
    fields: [featureRequestsTable.assignedToUserId],
    references: [usersTable.id],
    relationName: "assignee",
  }),
  prds: many(prdsTable),
}));

export const prdsRelations = relations(prdsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [prdsTable.organizationId],
    references: [organizationsTable.id],
  }),
  featureRequest: one(featureRequestsTable, {
    fields: [prdsTable.featureRequestId],
    references: [featureRequestsTable.id],
  }),
  engineeringTasks: many(engineeringTasksTable),
  pullRequests: many(pullRequestsTable),
}));

export const engineeringTasksRelations = relations(engineeringTasksTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [engineeringTasksTable.organizationId],
    references: [organizationsTable.id],
  }),
  prd: one(prdsTable, {
    fields: [engineeringTasksTable.prdId],
    references: [prdsTable.id],
  }),
  assignee: one(usersTable, {
    fields: [engineeringTasksTable.assigneeId],
    references: [usersTable.id],
  }),
}));

export const pullRequestsRelations = relations(pullRequestsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [pullRequestsTable.organizationId],
    references: [organizationsTable.id],
  }),
  prd: one(prdsTable, {
    fields: [pullRequestsTable.prdId],
    references: [prdsTable.id],
  }),
  aiReviews: many(aiReviewsTable),
  reviewHistory: many(reviewHistoryTable),
  releases: many(releasesTable),
}));

export const aiReviewsRelations = relations(aiReviewsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [aiReviewsTable.organizationId],
    references: [organizationsTable.id],
  }),
  pullRequest: one(pullRequestsTable, {
    fields: [aiReviewsTable.pullRequestId],
    references: [pullRequestsTable.id],
  }),
  reviewIssues: many(reviewIssuesTable),
}));

export const reviewIssuesRelations = relations(reviewIssuesTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [reviewIssuesTable.organizationId],
    references: [organizationsTable.id],
  }),
  aiReview: one(aiReviewsTable, {
    fields: [reviewIssuesTable.aiReviewId],
    references: [aiReviewsTable.id],
  }),
}));

export const reviewHistoryRelations = relations(reviewHistoryTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [reviewHistoryTable.organizationId],
    references: [organizationsTable.id],
  }),
  pullRequest: one(pullRequestsTable, {
    fields: [reviewHistoryTable.pullRequestId],
    references: [pullRequestsTable.id],
  }),
}));

export const releasesRelations = relations(releasesTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [releasesTable.organizationId],
    references: [organizationsTable.id],
  }),
  pullRequest: one(pullRequestsTable, {
    fields: [releasesTable.pullRequestId],
    references: [pullRequestsTable.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptionsTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [subscriptionsTable.organizationId],
    references: [organizationsTable.id],
  }),
}));

export const usageRelations = relations(usageTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [usageTable.organizationId],
    references: [organizationsTable.id],
  }),
}));
