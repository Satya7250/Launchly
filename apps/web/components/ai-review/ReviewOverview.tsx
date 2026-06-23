"use client";

import React, { useState, useEffect, useMemo } from "react";
import { trpc } from "~/trpc/client";
import { ReviewLoadingState } from "./ReviewLoadingState";
import { ReviewEmptyState } from "./ReviewEmptyState";
import { ReviewErrorState } from "./ReviewErrorState";
import { ReviewScoreCards } from "./ReviewScoreCards";
import { ReviewSummary } from "./ReviewSummary";
import { ReviewFindingsList } from "./ReviewFindingsList";
import { ReviewVersionSelector } from "./ReviewVersionSelector";
import { Button } from "~/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

interface ReviewOverviewProps {
  pullRequestId: string;
}

export function ReviewOverview({ pullRequestId }: ReviewOverviewProps) {
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const listQuery = trpc.review.list.useQuery(
    { pullRequestId, page: 1, limit: 100 },
    { enabled: !!pullRequestId }
  );

  const latestQuery = trpc.review.latest.useQuery(
    { pullRequestId },
    {
      enabled: !!pullRequestId,
      refetchInterval: (queryData) => {
        const review = (queryData as any)?.data?.data;
        if (review && (review.status === "COMPLETED" || review.status === "FAILED")) {
          return false;
        }
        const pollMs = process.env.NEXT_PUBLIC_AI_REVIEW_POLL_MS
          ? parseInt(process.env.NEXT_PUBLIC_AI_REVIEW_POLL_MS, 10)
          : 2000;
        return pollMs;
      },
    }
  );

  const selectedReviewQuery = trpc.review.byId.useQuery(
    { id: selectedReviewId! },
    { enabled: !!selectedReviewId }
  );

  const findingsQuery = trpc.review.findings.useQuery(
    { reviewId: selectedReviewId! },
    { enabled: !!selectedReviewId }
  );

  const generateMutation = trpc.review.generate.useMutation();
  const regenerateMutation = trpc.review.regenerate.useMutation();

  const allReviews = useMemo(() => {
    return listQuery.data?.data || [];
  }, [listQuery.data]);

  useEffect(() => {
    if (latestQuery.data?.data && !selectedReviewId) {
      setSelectedReviewId(latestQuery.data.data.id);
    }
  }, [latestQuery.data?.data, selectedReviewId]);

  useEffect(() => {
    if (latestQuery.data?.data && selectedReviewId) {
      const latest = latestQuery.data.data;
      const currentSelected = allReviews.find((r) => r.id === selectedReviewId);
      if (currentSelected && latest.version > currentSelected.version) {
        setSelectedReviewId(latest.id);
      }
    }
  }, [latestQuery.data?.data, allReviews, selectedReviewId]);

  const currentReview = selectedReviewId
    ? (selectedReviewQuery.data?.data || allReviews.find((r) => r.id === selectedReviewId))
    : latestQuery.data?.data;

  const findings = findingsQuery.data?.data || [];

  const isPending = currentReview?.status === "PENDING";
  const isGenerating = generateMutation.isPending || regenerateMutation.isPending;

  const handleGenerate = async () => {
    try {
      const result = await generateMutation.mutateAsync({ pullRequestId });
      toast.success("AI review generation started!");
      setSelectedReviewId(result.data.id);
    } catch (err: any) {
      if (err.data?.code === "CONFLICT") {
        toast.error("A review is already pending for this PR!");
      } else {
        toast.error("Failed to generate review");
      }
    }
  };

  const handleRegenerate = async () => {
    try {
      const result = await regenerateMutation.mutateAsync({ pullRequestId });
      toast.success("AI review regeneration started!");
      setSelectedReviewId(result.data.id);
    } catch (err: any) {
      if (err.data?.code === "CONFLICT") {
        toast.error("A review is already pending for this PR!");
      } else {
        toast.error("Failed to regenerate review");
      }
    }
  };

  if (listQuery.isLoading || latestQuery.isLoading) {
    return <ReviewLoadingState />;
  }

  if (listQuery.error || latestQuery.error) {
    return (
      <ReviewErrorState
        error={listQuery.error?.message || latestQuery.error?.message || "Something went wrong"}
        onRetry={() => {
          listQuery.refetch();
          latestQuery.refetch();
        }}
        isRetrying={listQuery.isRefetching || latestQuery.isRefetching}
      />
    );
  }

  if (allReviews.length === 0) {
    return (
      <ReviewEmptyState
        onGenerateReview={handleGenerate}
        isGenerating={isGenerating}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">AI Code Review</h2>
          <p className="text-sm text-muted-foreground">
            {currentReview?.status === "PENDING"
              ? "Review is being generated..."
              : currentReview?.status === "COMPLETED"
              ? `Review completed (v${currentReview.version})`
              : "Review failed"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {allReviews.length > 1 && (
            <ReviewVersionSelector
              versions={allReviews.map((r) => ({
                id: r.id,
                version: r.version,
                status: r.status,
                createdAt: r.createdAt,
              }))}
              selectedId={selectedReviewId || (allReviews[0] ? allReviews[0].id : "")}
              onSelect={setSelectedReviewId}
            />
          )}
          {!isPending && (
            <Button onClick={handleRegenerate} disabled={isGenerating} className="gap-2">
              {isGenerating ? (
                <>
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4" />
                  Regenerate
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isPending ? (
        <ReviewLoadingState />
      ) : (
        <>
          <ReviewScoreCards
            overallScore={currentReview?.overallScore || null}
            prdScore={currentReview?.prdScore || null}
            taskCoverageScore={currentReview?.taskCoverageScore || null}
            securityScore={currentReview?.securityScore || null}
            performanceScore={currentReview?.performanceScore || null}
            architectureScore={currentReview?.architectureScore || null}
          />

          <ReviewSummary
            summary={currentReview?.summary || null}
            recommendation={currentReview?.recommendation || null}
          />

          <ReviewFindingsList findings={findings} />
        </>
      )}
    </div>
  );
}
