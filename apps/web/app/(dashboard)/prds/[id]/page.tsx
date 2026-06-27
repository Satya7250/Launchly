"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowLeft,
  Brain,
  Calendar,
  Sparkles,
  RefreshCw,
  GitBranch,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  Printer,
  ChevronRight,
  ExternalLink,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { formatDate as formatUtilityDate } from "~/lib/utils";
import { KanbanBoard } from "~/components/KanbanBoard";

export default function PRDDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState("context");

  // Query this PRD's details
  const { data: prdEnvelope, isLoading: prdLoading } = trpc.prd.byId.useQuery({ id });
  const prd = prdEnvelope?.data;

  // Query all versions of this PRD for history (using featureRequestId once loaded)
  const { data: versionsEnvelope, isLoading: versionsLoading } =
    trpc.prd.versions.useQuery(
      { featureRequestId: prd?.featureRequestId as string },
      { enabled: !!prd?.featureRequestId }
    );
  const versions = versionsEnvelope?.data ?? [];

  // Query feature request to get links/details
  const { data: requestEnvelope } = trpc.featureRequest.byId.useQuery(
    { id: prd?.featureRequestId as string },
    { enabled: !!prd?.featureRequestId }
  );
  const featureRequest = requestEnvelope?.data;

  // Mutation to regenerate PRD
  const regenerateMutation = trpc.prd.regenerate.useMutation();

  const handleRegenerate = async () => {
    if (!prd) return;
    const toastId = toast.loading("AI is analyzing updates and drafting next version...");
    try {
      const response = await regenerateMutation.mutateAsync({
        featureRequestId: prd.featureRequestId,
      });
      const newPrd = response.data;
      toast.success("Successfully generated new PRD version!", { id: toastId });
      // Redirect to the newly generated version
      router.push(`/prds/${newPrd.id}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate PRD", { id: toastId });
    }
  };

  const formatDate = (dateStr: string) =>
    formatUtilityDate(dateStr, {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (prdLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!prd) {
    return (
      <div className="text-center py-24">
        <h3 className="text-lg font-semibold">PRD not found</h3>
        <Button asChild className="mt-4">
          <Link href="/prds">Back to List</Link>
        </Button>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content = prd.content as any;
  const prdTitle = content?.title || `PRD for Feature Request`;
  const isRegenerating = regenerateMutation.isPending;

  return (
    <div className="space-y-6 relative print:p-0 print:m-0">
      {/* Regeneration Spinner Overlay */}
      {isRegenerating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex flex-col justify-center items-center z-50 space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <Brain className="h-12 w-12 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">AI Agent Drafting Spec...</h2>
          <p className="text-sm text-muted-foreground max-w-xs text-center leading-relaxed">
            Please wait while ShipFlow AI generates a structured Product Requirements Document. This will take a few seconds.
          </p>
          <Spinner />
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground hover:text-foreground">
            <Link href="/prds">
              <ArrowLeft className="h-4 w-4" /> Back to List
            </Link>
          </Button>
          {featureRequest && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              <Button variant="ghost" size="sm" asChild className="gap-1.5 text-primary hover:text-primary/80">
                <Link href={`/feature-requests/${featureRequest.id}`}>
                  Origin Request <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" /> Print / PDF
          </Button>
          <Button size="sm" onClick={handleRegenerate} disabled={isRegenerating} className="gap-2 bg-gradient-to-r from-primary to-primary/80">
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} /> Regenerate Spec
          </Button>
        </div>
      </div>

      {/* Title block */}
      <div className="bg-card/30 backdrop-blur-xl border border-border/40 p-6 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {featureRequest && (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase text-[10px]">
              {featureRequest.project.name}
            </Badge>
          )}
          <Badge variant="secondary" className="font-bold text-[10px] tracking-wide uppercase">
            Version {prd.version}
          </Badge>
          <span className="text-muted-foreground/60 text-xs">•</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Generated {formatDate(prd.createdAt)}
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
          {prdTitle}
        </h1>
      </div>

      {/* Main Grid: Spec viewer and sidebar version list */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Spec Content tabs (radix tabs) */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-card/40 border border-border/40 p-1 rounded-xl h-11 print:hidden">
              <TabsTrigger value="context" className="h-9">
                <Bookmark className="h-3.5 w-3.5" /> Context & Goals
              </TabsTrigger>
              <TabsTrigger value="functional" className="h-9">
                <FileText className="h-3.5 w-3.5" /> Functional Specs
              </TabsTrigger>
              <TabsTrigger value="strategy" className="h-9">
                <Sparkles className="h-3.5 w-3.5" /> Scope & Risks
              </TabsTrigger>
              <TabsTrigger value="tasks" className="h-9">
                <Workflow className="h-3.5 w-3.5" /> Engineering Tasks
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Context & Scope */}
            <TabsContent value="context" className="mt-6 space-y-6">
              <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">1. Problem Statement</CardTitle>
                </CardHeader>
                <CardContent className="border-t border-border/10 pt-5 text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                  {prd.problemStatement}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-green-500 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" /> Objectives & Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="border-t border-border/10 pt-5">
                    <ul className="list-disc pl-5 space-y-3 text-sm text-muted-foreground">
                      {prd.goals.map((goal, idx) => (
                        <li key={idx} className="leading-relaxed"><span className="text-foreground">{goal}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-muted-foreground flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" /> Boundaries & Non-Goals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="border-t border-border/10 pt-5">
                    <ul className="list-disc pl-5 space-y-3 text-sm text-muted-foreground">
                      {prd.nonGoals.map((nonGoal, idx) => (
                        <li key={idx} className="leading-relaxed"><span className="text-foreground">{nonGoal}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Target User Personas</CardTitle>
                  <CardDescription>Primary roles and stakeholders targeted by this feature.</CardDescription>
                </CardHeader>
                <CardContent className="border-t border-border/10 pt-5">
                  <ul className="space-y-3">
                    {content.targetUsers?.map((user: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm">
                        <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <span className="leading-relaxed text-foreground">{user}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Functional Specs */}
            <TabsContent value="functional" className="mt-6 space-y-6">
              {/* Functional Requirements */}
              <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Functional Requirements</CardTitle>
                  <CardDescription>Detailed mapping of capabilities to build.</CardDescription>
                </CardHeader>
                <CardContent className="border-t border-border/10 p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/20 bg-muted/40 text-muted-foreground font-bold text-xs">
                          <th className="p-4 w-20">ID</th>
                          <th className="p-4 w-48">Requirement</th>
                          <th className="p-4">Detailed Description</th>
                          <th className="p-4 w-24">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.functionalRequirements?.map(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (req: any, idx: number) => (
                          <tr key={idx} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                            <td className="p-4 font-mono font-bold text-xs text-primary">{req.id}</td>
                            <td className="p-4 font-semibold text-foreground">{req.title}</td>
                            <td className="p-4 text-muted-foreground leading-relaxed">{req.description}</td>
                            <td className="p-4">
                              <Badge
                                variant="outline"
                                className={
                                  req.priority === "HIGH"
                                    ? "bg-red-500/10 text-red-500 border-red-500/20 text-[10px] font-bold"
                                    : req.priority === "MEDIUM"
                                    ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[10px] font-bold"
                                    : "bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] font-bold"
                                }
                              >
                                {req.priority}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* User Stories */}
              <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">User Stories</CardTitle>
                  <CardDescription>Scope representations of business value.</CardDescription>
                </CardHeader>
                <CardContent className="border-t border-border/10 pt-5">
                  <ul className="space-y-4">
                    {// eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (prd.userStories as any[]).map(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (storyObj: any, idx: number) => (
                      <li key={idx} className="p-4 rounded-xl border border-border/20 bg-muted/20 space-y-2">
                        <div className="text-xs uppercase font-bold text-primary tracking-wider">Story {idx + 1}</div>
                         <p className="text-sm font-semibold leading-relaxed text-foreground">&quot;{storyObj.story}&quot;</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="font-bold text-foreground">Business Value:</span> {storyObj.value}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Acceptance Criteria */}
              <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Acceptance Criteria</CardTitle>
                </CardHeader>
                <CardContent className="border-t border-border/10 pt-5">
                  <ul className="list-decimal pl-5 space-y-3 text-sm text-muted-foreground">
                    {prd.acceptanceCriteria.map((criteria, idx) => (
                      <li key={idx} className="leading-relaxed"><span className="text-foreground">{criteria}</span></li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Edge Cases */}
              <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Handling Edge Cases</CardTitle>
                </CardHeader>
                <CardContent className="border-t border-border/10 pt-5">
                  <ul className="list-disc pl-5 space-y-3 text-sm text-muted-foreground">
                    {prd.edgeCases.map((edgeCase, idx) => (
                      <li key={idx} className="leading-relaxed"><span className="text-foreground">{edgeCase}</span></li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Strategy */}
            <TabsContent value="strategy" className="mt-6 space-y-6">
              <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Executive Summary</CardTitle>
                </CardHeader>
                <CardContent className="border-t border-border/10 pt-5 text-sm leading-relaxed text-muted-foreground">
                  {content.executiveSummary}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Non-Functional Requirements */}
                <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Non-Functional Constraints</CardTitle>
                  </CardHeader>
                  <CardContent className="border-t border-border/10 pt-5">
                    <ul className="space-y-4">
                      {content.nonFunctionalRequirements?.map(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (nfr: any, idx: number) => (
                        <li key={idx} className="space-y-1">
                          <span className="text-xs uppercase font-bold text-primary tracking-wider">{nfr.category}</span>
                          <p className="text-sm text-foreground">{nfr.description}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Assumptions */}
                <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">System Assumptions</CardTitle>
                  </CardHeader>
                  <CardContent className="border-t border-border/10 pt-5">
                    <ul className="list-disc pl-5 space-y-3 text-sm text-muted-foreground">
                      {content.assumptions?.map((assump: string, idx: number) => (
                        <li key={idx} className="leading-relaxed"><span className="text-foreground">{assump}</span></li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Risks & Mitigations */}
              <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-red-500/80 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Risks & Mitigations
                  </CardTitle>
                </CardHeader>
                <CardContent className="border-t border-border/10 p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/20 bg-muted/40 text-muted-foreground font-bold text-xs">
                          <th className="p-4 w-1/2">Risk Description</th>
                          <th className="p-4 w-1/2">Mitigation Strategy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {content.risks?.map(
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (risk: any, idx: number) => (
                          <tr key={idx} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                            <td className="p-4 text-foreground leading-relaxed">{risk.description}</td>
                            <td className="p-4 text-muted-foreground leading-relaxed font-medium bg-green-500/5">{risk.mitigation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Success Metrics */}
              <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Success Metrics (KPIs)</CardTitle>
                </CardHeader>
                <CardContent className="border-t border-border/10 pt-5">
                  <ul className="list-disc pl-5 space-y-3 text-sm text-muted-foreground">
                    {prd.successMetrics.map((metric, idx) => (
                      <li key={idx} className="leading-relaxed"><span className="text-foreground">{metric}</span></li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: Tasks & Board */}
            <TabsContent value="tasks" className="mt-6 space-y-6">
              <KanbanBoard prdId={id} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar: History and versions list */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <Card className="border border-border/40 bg-card/40 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <GitBranch className="h-4 w-4 text-primary" /> Document History
              </CardTitle>
              <CardDescription className="text-xs">Switch between generated iterations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {versionsLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner className="h-5 w-5" />
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {versions.map((ver) => {
                    const isCurrent = ver.id === id;
                    return (
                      <Button
                        key={ver.id}
                        variant={isCurrent ? "secondary" : "ghost"}
                        onClick={() => router.push(`/prds/${ver.id}`)}
                        className={`w-full justify-start text-xs font-semibold h-10 px-2.5 rounded-lg border ${
                          isCurrent
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "border-transparent hover:bg-accent/40"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>Version {ver.version}</span>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold">
                            {formatUtilityDate(ver.createdAt, { month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
