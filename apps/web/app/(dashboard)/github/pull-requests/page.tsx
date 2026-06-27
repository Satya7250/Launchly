"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Label } from "~/components/ui/label";
import {
  GitPullRequest,
  User,
  GitBranch,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  GitMerge,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "~/lib/utils";

export default function PullRequestsPage() {
  const searchParams = useSearchParams();
  const initialRepoId = searchParams.get("repositoryId") || "";

  const [repoIdFilter, setRepoIdFilter] = useState<string>(initialRepoId);
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  // Query pull requests list
  const { data: prsEnvelope, isLoading: isPrsLoading, refetch } = trpc.github.pullRequests.useQuery({
    page,
    limit,
    repositoryId: repoIdFilter || undefined,
  });

  // Query connected repos to populate the filter dropdown
  const { data: reposEnvelope, isLoading: isReposLoading } = trpc.github.repositories.useQuery({});

  const connectedRepos = reposEnvelope?.data?.connected ?? [];
  const prs = prsEnvelope?.data?.items ?? [];
  const pagination = prsEnvelope?.data?.pagination ?? { page: 1, totalPages: 1, totalCount: 0 };

  const handleRepoFilterChange = (val: string) => {
    setRepoIdFilter(val);
    setPage(1); // reset to first page
  };

  const getProcessingBadge = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Received
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            Processing
          </span>
        );
      case "READY_FOR_AI_REVIEW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Ready for AI Review
          </span>
        );
      case "AI_REVIEWING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            AI Reviewing
          </span>
        );
      case "AI_REVIEW_COMPLETED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            AI Review Completed
          </span>
        );
      case "HUMAN_APPROVED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Human Approved
          </span>
        );
      case "SHIPPED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Shipped
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const getPRStateIcon = (state: string) => {
    switch (state) {
      case "merged":
        return <GitMerge className="h-4 w-4 text-purple-400" />;
      case "closed":
        return <GitPullRequest className="h-4 w-4 text-red-400" />;
      case "open":
      default:
        return <GitPullRequest className="h-4 w-4 text-emerald-400" />;
    }
  };

  const isLoading = isPrsLoading || isReposLoading;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Pull Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and monitor pull request status and ingestion progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 h-9 bg-card/40 border-border/60">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Link href="/github">
            <Button size="sm" className="h-9">
              Manage Repositories
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-end gap-4 p-4 rounded-xl border border-border/40 bg-card/25 backdrop-blur-md">
        <div className="w-full sm:max-w-xs space-y-1.5">
          <Label htmlFor="repo-filter" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
            Filter by Repository
          </Label>
          <select
            id="repo-filter"
            value={repoIdFilter}
            onChange={(e) => handleRepoFilterChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/60 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
          >
            <option value="">All Connected Repositories</option>
            {connectedRepos.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PR Table/List */}
      <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-24">
              <Spinner />
            </div>
          ) : prs.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <GitPullRequest className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">No pull requests found</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {repoIdFilter
                    ? "No pull requests have been ingested yet for this repository. Trigger a GitHub event (like opening a PR) to sync details."
                    : "No repositories have synced pull requests yet. Connect a repository and open a pull request on GitHub."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/20 text-xs uppercase font-bold text-muted-foreground tracking-wider">
                    <th className="px-6 py-4">Pull Request</th>
                    <th className="px-6 py-4">Repository</th>
                    <th className="px-6 py-4">Branch / Author</th>
                    <th className="px-6 py-4">Processing Status</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {prs.map(({ pullRequest: pr, repositoryName }) => (
                    <tr key={pr.id} className="hover:bg-accent/5 transition-all group">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3 min-w-[280px]">
                          <div className="mt-0.5 shrink-0">
                            {getPRStateIcon(pr.state)}
                          </div>
                          <div>
                            <Link
                              href={`/github/pull-requests/${pr.id}`}
                              className="font-semibold text-sm hover:text-primary transition-colors block line-clamp-1 text-foreground/90"
                            >
                              {pr.title}
                            </Link>
                            <span className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1.5">
                              #{pr.number} by @{pr.author}
                              <a
                                href={pr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground inline-flex items-center ml-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-foreground/80 px-2 py-1 rounded bg-muted/40">
                          {repositoryName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <GitBranch className="h-3.5 w-3.5 text-primary/75" />
                            <span className="font-mono truncate max-w-[120px]">{pr.branch}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span>{pr.author}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getProcessingBadge(pr.processingStatus)}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(pr.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/github/pull-requests/${pr.id}`}>
                          <Button size="sm" variant="ghost" className="hover:bg-accent/40 text-xs">
                            View details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border/20 bg-muted/10 text-sm">
                  <span className="text-xs text-muted-foreground">
                    Showing page {page} of {pagination.totalPages} ({pagination.totalCount} total)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="gap-1 bg-card/50"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="gap-1 bg-card/50"
                    >
                      Next <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
