"use client";

import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

interface ReviewErrorStateProps {
  error: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function ReviewErrorState({ error, onRetry, isRetrying }: ReviewErrorStateProps) {
  return (
    <Card className="border border-red-500/30 bg-red-500/5 backdrop-blur-md shadow-xl">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="mb-6 rounded-full bg-red-500/10 p-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
        </div>
        <div className="text-center space-y-2 mb-8">
          <h3 className="text-xl font-bold">Failed to load review</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {error}
          </p>
        </div>
        <Button variant="destructive" onClick={onRetry} disabled={isRetrying} className="gap-2">
          {isRetrying ? (
            <>
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
