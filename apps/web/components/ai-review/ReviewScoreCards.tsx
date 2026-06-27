"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Shield,
  Zap,
  Building2,
  FileText,
  CheckSquare,
} from "lucide-react";

interface ScoreData {
  label: string;
  score: number | null;
  icon: React.ReactNode;
  color: string;
}

interface ReviewScoreCardsProps {
  overallScore: number | null;
  prdScore: number | null;
  taskCoverageScore: number | null;
  securityScore: number | null;
  performanceScore: number | null;
  architectureScore: number | null;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function RingProgress({ score, size = 120, strokeWidth = 8 }: { score: number | null; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = score ? circumference - (score / 100) * circumference : circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted-foreground/20"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={score ? getScoreColor(score) : "text-muted-foreground/20"}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 0.5s ease-in-out",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-2xl font-bold ${score ? getScoreColor(score) : "text-muted-foreground"}`}>
          {score != null ? `${Math.round(score)}` : "—"}
        </span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

export function ReviewScoreCards({
  overallScore,
  prdScore,
  taskCoverageScore,
  securityScore,
  performanceScore,
  architectureScore,
}: ReviewScoreCardsProps) {
  const scores = useMemo<ScoreData[]>(
    () => [
      {
        label: "PRD Alignment",
        score: prdScore,
        icon: <FileText className="h-4 w-4 text-blue-400" />,
        color: "text-blue-400",
      },
      {
        label: "Task Coverage",
        score: taskCoverageScore,
        icon: <CheckSquare className="h-4 w-4 text-purple-400" />,
        color: "text-purple-400",
      },
      {
        label: "Security",
        score: securityScore,
        icon: <Shield className="h-4 w-4 text-red-400" />,
        color: "text-red-400",
      },
      {
        label: "Performance",
        score: performanceScore,
        icon: <Zap className="h-4 w-4 text-amber-400" />,
        color: "text-amber-400",
      },
      {
        label: "Architecture",
        score: architectureScore,
        icon: <Building2 className="h-4 w-4 text-emerald-400" />,
        color: "text-emerald-400",
      },
    ],
    [prdScore, taskCoverageScore, securityScore, performanceScore, architectureScore]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
      <Card className="lg:col-span-2 border border-border/40 bg-card/45 backdrop-blur-md shadow-xl flex items-center justify-center">
        <CardContent className="pt-6">
          <RingProgress score={overallScore} size={140} strokeWidth={10} />
        </CardContent>
      </Card>

      {scores.map((score, index) => (
        <Card key={index} className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {score.icon}
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {score.label}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${score.score != null ? getScoreColor(score.score) : "text-muted-foreground"}`}>
              {score.score != null ? `${Math.round(score.score)}` : "—"}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
