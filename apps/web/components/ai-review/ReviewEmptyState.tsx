"use client";

import React from "react";
import { FileText, Sparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface ReviewEmptyStateProps {
  onGenerateReview: () => void;
  isGenerating: boolean;
}

export function ReviewEmptyState({ onGenerateReview, isGenerating }: ReviewEmptyStateProps) {
  return (
    <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="mb-6 rounded-full bg-primary/10 p-4">
          <Sparkles className="h-12 w-12 text-primary" />
        </div>
        <div className="text-center space-y-2 mb-8">
          <h3 className="text-xl font-bold">No AI Review Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Generate an AI-powered code review to analyze this pull request for security, performance, and best practices.
          </p>
        </div>
        <Button onClick={onGenerateReview} disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <>
              <FileText className="h-4 w-4 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate AI Review
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
