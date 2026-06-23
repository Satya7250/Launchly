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
import { pullRequestFilesTable } from "./pull-request-files";
import { aiReviewsTable } from "./ai-reviews";
import { aiReviewFindingsTable } from "./ai-review-findings";
import { aiReviewAuditsTable } from "./ai-review-audits";
import { reviewIssuesTable } from "./review-issues";
import { reviewHistoryTable } from "./review-history";
import { releasesTable } from "./releases";
import { subscriptionsTable } from "./subscriptions";
import { usageTable } from "./usage";
import { taskGenerationAuditsTable } from "./task-generation-audits";
import { githubSyncAuditsTable } from "./github-sync-audits";
import { releaseApprovalsTable } from "./release_approvals";


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
  releaseApprovals: many(releaseApprovalsTable),
  subscription: one(subscriptionsTable),
  usages: many(usageTable),
  taskGenerationAudits: many(taskGenerationAuditsTable),
  githubSyncAudits: many(githubSyncAuditsTable),
}));

export const usersRelations = relations(usersTable, ({ many }) => ({
  memberships: many(membershipsTable),
  assignedTasks: many(engineeringTasksTable),
  sessions: many(sessionsTable),
  accounts: many(accountsTable),
  createdFeatureRequests: many(featureRequestsTable, { relationName: "creator" }),
  assignedFeatureRequests: many(featureRequestsTable, { relationName: "assignee" }),
  approvedReleaseApprovals: many(releaseApprovalsTable),
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
  engineeringTasks: many(engineeringTasksTable),
  releaseApprovals: many(releaseApprovalsTable),
}));

export const repositoriesRelations = relations(repositoriesTable, ({ one, many }) => ({
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
  pullRequests: many(pullRequestsTable),
  syncAudits: many(githubSyncAuditsTable),
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
  taskGenerationAudits: many(taskGenerationAuditsTable),
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
  project: one(projectsTable, {
    fields: [engineeringTasksTable.projectId],
    references: [projectsTable.id],
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
  repository: one(repositoriesTable, {
    fields: [pullRequestsTable.repositoryId],
    references: [repositoriesTable.id],
  }),
  files: many(pullRequestFilesTable),
  aiReviews: many(aiReviewsTable),
  reviewHistory: many(reviewHistoryTable),
  releases: many(releasesTable),
  releaseApprovals: many(releaseApprovalsTable),
  syncAudits: many(githubSyncAuditsTable),
}));

export const pullRequestFilesRelations = relations(pullRequestFilesTable, ({ one }) => ({
  pullRequest: one(pullRequestsTable, {
    fields: [pullRequestFilesTable.pullRequestId],
    references: [pullRequestsTable.id],
  }),
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
  findings: many(aiReviewFindingsTable),
  audits: many(aiReviewAuditsTable),
}));

export const aiReviewFindingsRelations = relations(aiReviewFindingsTable, ({ one }) => ({
  review: one(aiReviewsTable, {
    fields: [aiReviewFindingsTable.reviewId],
    references: [aiReviewsTable.id],
  }),
}));

export const aiReviewAuditsRelations = relations(aiReviewAuditsTable, ({ one }) => ({
  review: one(aiReviewsTable, {
    fields: [aiReviewAuditsTable.reviewId],
    references: [aiReviewsTable.id],
  }),
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

export const taskGenerationAuditsRelations = relations(taskGenerationAuditsTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [taskGenerationAuditsTable.organizationId],
    references: [organizationsTable.id],
  }),
  prd: one(prdsTable, {
    fields: [taskGenerationAuditsTable.prdId],
    references: [prdsTable.id],
  }),
}));

export const githubSyncAuditsRelations = relations(githubSyncAuditsTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [githubSyncAuditsTable.organizationId],
    references: [organizationsTable.id],
  }),
  repository: one(repositoriesTable, {
    fields: [githubSyncAuditsTable.repositoryId],
    references: [repositoriesTable.id],
  }),
  pullRequest: one(pullRequestsTable, {
    fields: [githubSyncAuditsTable.pullRequestId],
    references: [pullRequestsTable.id],
  }),
}));

export const releaseApprovalsRelations = relations(releaseApprovalsTable, ({ one }) => ({
  organization: one(organizationsTable, {
    fields: [releaseApprovalsTable.organizationId],
    references: [organizationsTable.id],
  }),
  project: one(projectsTable, {
    fields: [releaseApprovalsTable.projectId],
    references: [projectsTable.id],
  }),
  pullRequest: one(pullRequestsTable, {
    fields: [releaseApprovalsTable.pullRequestId],
    references: [pullRequestsTable.id],
  }),
  review: one(aiReviewsTable, {
    fields: [releaseApprovalsTable.reviewId],
    references: [aiReviewsTable.id],
  }),
  approvedByUser: one(usersTable, {
    fields: [releaseApprovalsTable.approvedBy],
    references: [usersTable.id],
  }),
}));

