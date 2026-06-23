"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  FileCode,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Button } from "~/components/ui/button";

interface Finding {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: string;
  title: string;
  description: string;
  suggestion: string | null;
  filePath: string | null;
  lineStart: number | null;
  lineEnd: number | null;
}

interface ReviewFindingsListProps {
  findings: Finding[];
}

function getSeverityIcon(severity: Finding["severity"]) {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "MEDIUM":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case "LOW":
    case "INFO":
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

function getSeverityBadgeVariant(severity: Finding["severity"]) {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "secondary";
    case "LOW":
    case "INFO":
    default:
      return "outline";
  }
}

export function ReviewFindingsList({ findings }: ReviewFindingsListProps) {
  const groupedFindings = useMemo(() => {
    const groups: Record<string, Finding[]> = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
      INFO: [],
    };

    findings.forEach((finding) => {
      const group = groups[finding.severity];
      if (group) {
        group.push(finding);
      }
    });

    return groups;
  }, [findings]);

  const allSeverities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Findings
      </h3>
      {allSeverities.map((severity) => {
        const items = groupedFindings[severity];
        if (!items || items.length === 0) return null;

        return (
          <div key={severity} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={getSeverityBadgeVariant(severity)} className="uppercase">
                {severity}
              </Badge>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            {items.map((finding) => (
              <Collapsible key={finding.id} className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl rounded-lg">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <div className="flex items-start gap-3 text-left">
                      {getSeverityIcon(finding.severity)}
                      <div>
                        <div className="font-semibold text-sm">{finding.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {finding.category}
                          </Badge>
                          {finding.filePath && (
                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                              <FileCode className="h-3 w-3" />
                              {finding.filePath}
                              {finding.lineStart && `:${finding.lineStart}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4 space-y-4">
                  <div>
                    <h5 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">
                      Description
                    </h5>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                      {finding.description}
                    </p>
                  </div>
                  {finding.suggestion && (
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1 uppercase">
                        Suggested Fix
                      </h5>
                      <div className="bg-muted/40 p-3 rounded-md text-sm font-mono whitespace-pre-wrap">
                        {finding.suggestion}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        );
      })}

      {findings.length === 0 && (
        <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
            <p className="text-sm font-semibold">No issues found</p>
            <p className="text-xs text-muted-foreground">Great job! No findings to report.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
