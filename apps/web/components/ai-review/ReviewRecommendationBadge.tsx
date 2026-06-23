"use client";

import React from "react";
import { Badge } from "~/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";

interface ReviewRecommendationBadgeProps {
  recommendation: "APPROVE" | "REQUEST_CHANGES" | "COMMENT" | null;
}

export function ReviewRecommendationBadge({ recommendation }: ReviewRecommendationBadgeProps) {
  if (!recommendation) {
    return null;
  }

  switch (recommendation) {
    case "APPROVE":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 gap-1">
          <CheckCircle className="h-3.5 w-3.5" />
          APPROVE
        </Badge>
      );
    case "REQUEST_CHANGES":
      return (
        <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          REQUEST CHANGES
        </Badge>
      );
    case "COMMENT":
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">
          COMMENT
        </Badge>
      );
    default:
      return null;
  }
}
