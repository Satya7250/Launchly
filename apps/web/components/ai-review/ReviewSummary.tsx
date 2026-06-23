"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ReviewRecommendationBadge } from "./ReviewRecommendationBadge";

interface ReviewSummaryProps {
  summary: string | null;
  recommendation: "APPROVE" | "REQUEST_CHANGES" | "COMMENT" | null;
}

export function ReviewSummary({ summary, recommendation }: ReviewSummaryProps) {
  return (
    <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Executive Summary
          </CardTitle>
          <ReviewRecommendationBadge recommendation={recommendation} />
        </div>
      </CardHeader>
      <CardContent>
        {summary ? (
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
            {summary}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No summary available yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
