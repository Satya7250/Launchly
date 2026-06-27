"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  ShieldCheck,
  Send,
  Check,
  X,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "~/lib/utils";

export default function ReleaseApprovalPage() {
  const params = useParams();
  const router = useRouter();
  const prId = params.id as string;

  const [comments, setComments] = useState("");

  // Queries
  const { data: prEnvelope, isLoading: isPrLoading } = trpc.github.pullRequestById.useQuery(
    { id: prId },
    { enabled: !!prId }
  );

  const { data: statusEnvelope, isLoading: isStatusLoading, refetch: refetchStatus } = trpc.approval.status.useQuery(
    { pullRequestId: prId },
    { enabled: !!prId }
  );

  const { data: historyEnvelope, isLoading: isHistoryLoading, refetch: refetchHistory } = trpc.approval.history.useQuery(
    { pullRequestId: prId },
    { enabled: !!prId }
  );

  // Mutations
  const requestMutation = trpc.approval.request.useMutation();
  const approveMutation = trpc.approval.approve.useMutation();
  const rejectMutation = trpc.approval.reject.useMutation();

  const pr = prEnvelope?.data?.pullRequest;
  const status = statusEnvelope?.data;
  const history = historyEnvelope?.data || [];

  const isLoading = isPrLoading || isStatusLoading || isHistoryLoading;

  const handleRequestApproval = async () => {
    try {
      await requestMutation.mutateAsync({
        pullRequestId: prId,
        comments: comments.trim() || undefined,
      });
      toast.success("Release approval requested successfully!");
      setComments("");
      refetchStatus();
      refetchHistory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to request approval");
    }
  };

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({
        pullRequestId: prId,
        comments: comments.trim() || undefined,
      });
      toast.success("Release approved successfully!");
      setComments("");
      refetchStatus();
      refetchHistory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to approve release");
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      toast.error("Comments are required to reject a release");
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        pullRequestId: prId,
        comments: comments.trim(),
      });
      toast.success("Release rejected");
      setComments("");
      refetchStatus();
      refetchHistory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to reject release");
    }
  };

  const getReleaseStatusBadge = (state: string) => {
    switch (state) {
      case "NOT_READY":
        return <Badge variant="secondary">NOT READY</Badge>;
      case "READY_FOR_APPROVAL":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">READY FOR APPROVAL</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">APPROVED</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">REJECTED</Badge>;
      case "SHIPPED":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">SHIPPED</Badge>;
      default:
        return <Badge variant="secondary">{state}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="text-center py-20 flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h3 className="text-lg font-semibold">Pull request not found</h3>
        <Button onClick={() => router.push("/github/pull-requests")}>
          Back to Pull Requests
        </Button>
      </div>
    );
  }

  const checklist = status?.checklist || {
    prdExists: false,
    tasksExist: false,
    pullRequestExists: false,
    aiReviewCompleted: false,
    blockingFindingsCount: 0,
  };

  const releaseStatus = status?.releaseStatus || "NOT_READY";

  const isChecklistComplete =
    checklist.prdExists &&
    checklist.tasksExist &&
    checklist.pullRequestExists &&
    checklist.aiReviewCompleted &&
    checklist.blockingFindingsCount === 0;

  const isMutating = requestMutation.isPending || approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="flex flex-col gap-4 border-b border-border/20 pb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/github/pull-requests/${prId}`)}
            className="gap-1 p-0 h-auto hover:bg-transparent hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to PR Details
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-3">
              Release Approval: {pr.title}
              <span className="text-xl text-muted-foreground font-light">#{pr.number}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Review checklist compliance, submit decisions, and audit historical releases.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground mr-1">Current State:</span>
            {getReleaseStatusBadge(releaseStatus)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Release Checklist Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Release Compliance Checklist
              </CardTitle>
              <CardDescription>
                Automated check gates that must be satisfied before human approval is unlocked.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PRD Gate */}
              <div className="flex items-start justify-between p-3 rounded-lg bg-background/30 border border-border/10">
                <div>
                  <h4 className="text-sm font-semibold">Product Requirement Document (PRD)</h4>
                  <p className="text-xs text-muted-foreground">Checks if a PRD is associated with the pull request.</p>
                </div>
                {checklist.prdExists ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                    <Check className="h-3 w-3" /> Met
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                    <X className="h-3 w-3" /> Missing
                  </Badge>
                )}
              </div>

              {/* Tasks Gate */}
              <div className="flex items-start justify-between p-3 rounded-lg bg-background/30 border border-border/10">
                <div>
                  <h4 className="text-sm font-semibold">Engineering Tasks</h4>
                  <p className="text-xs text-muted-foreground">Confirms developer tasks have been generated for the PRD.</p>
                </div>
                {checklist.tasksExist ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                    <Check className="h-3 w-3" /> Met
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                    <X className="h-3 w-3" /> Missing
                  </Badge>
                )}
              </div>

              {/* PR Synchronized Gate */}
              <div className="flex items-start justify-between p-3 rounded-lg bg-background/30 border border-border/10">
                <div>
                  <h4 className="text-sm font-semibold">Pull Request Synchronized</h4>
                  <p className="text-xs text-muted-foreground">Ensures code diff details exist in Launchly databases.</p>
                </div>
                {checklist.pullRequestExists ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                    <Check className="h-3 w-3" /> Met
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                    <X className="h-3 w-3" /> Failed
                  </Badge>
                )}
              </div>

              {/* AI Review Gate */}
              <div className="flex items-start justify-between p-3 rounded-lg bg-background/30 border border-border/10">
                <div>
                  <h4 className="text-sm font-semibold">Latest AI Review Completed</h4>
                  <p className="text-xs text-muted-foreground">AI code analysis job status.</p>
                </div>
                {checklist.aiReviewCompleted ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                    <Check className="h-3 w-3" /> Completed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                    <X className="h-3 w-3" /> Not Done
                  </Badge>
                )}
              </div>

              {/* Blocking Findings Gate */}
              <div className="flex items-start justify-between p-3 rounded-lg bg-background/30 border border-border/10">
                <div>
                  <h4 className="text-sm font-semibold">No Blocking AI Findings</h4>
                  <p className="text-xs text-muted-foreground">Ensures zero CRITICAL or HIGH findings remain open.</p>
                </div>
                {checklist.blockingFindingsCount === 0 ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                    <Check className="h-3 w-3" /> 0 Open
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 gap-1">
                    <X className="h-3 w-3" /> {checklist.blockingFindingsCount} Open
                  </Badge>
                )}
              </div>

              {/* Status helper text */}
              {isChecklistComplete ? (
                <Alert className="bg-emerald-500/10 border-emerald-500/25">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <AlertTitle className="text-emerald-400 font-semibold">Checklist Compliant</AlertTitle>
                  <AlertDescription className="text-xs text-emerald-500/90">
                    All compliance checkpoints have been successfully cleared. Release approval can be executed by human reviewers.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-amber-500/10 border-amber-500/25">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertTitle className="text-amber-400 font-semibold">Checklist Deficiencies</AlertTitle>
                  <AlertDescription className="text-xs text-amber-500/90">
                    One or more automated checklist requirements have not been met. Human approval will be blocked until these items are corrected.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Audit History / Timeline */}
          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5 text-primary" />
                Immutable Audit Trail
              </CardTitle>
              <CardDescription>
                Chronological list of all release requests, approvals, and rejections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  No release actions recorded yet.
                </div>
              ) : (
                <div className="relative border-l border-border/40 pl-6 ml-3 space-y-6">
                  {history.map((record) => (
                    <div key={record.id} className="relative">
                      {/* Action dot */}
                      <span className={`absolute -left-[31px] top-0.5 rounded-full p-0.5 border ${
                        record.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                          : record.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : "bg-red-500/10 text-red-500 border-red-500/30"
                      }`}>
                        {record.status === "PENDING" && <Send className="h-3 w-3" />}
                        {record.status === "APPROVED" && <Check className="h-3 w-3" />}
                        {record.status === "REJECTED" && <X className="h-3 w-3" />}
                      </span>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">
                            {record.status === "PENDING" && "Approval Requested"}
                            {record.status === "APPROVED" && "Release Approved"}
                            {record.status === "REJECTED" && "Release Rejected"}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatDate(record.createdAt)}
                          </span>
                          {record.reviewVersion && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                              v{record.reviewVersion} Review
                            </Badge>
                          )}
                        </div>

                        {record.comments && (
                          <p className="text-xs text-foreground/80 bg-muted/20 p-2.5 rounded border border-border/10 italic whitespace-pre-wrap max-w-2xl">
                            &ldquo;{record.comments}&rdquo;
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Action By ID: {record.approvedBy || "User"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Approval Panel (Decisions & Comments) */}
        <div>
          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Approval Decision Control
              </CardTitle>
              <CardDescription>
                Execute release transitions and record reviewer feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="decision-comments" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                  Reviewer Comments
                </Label>
                <Textarea
                  id="decision-comments"
                  placeholder="Provide detailed release notes, feedback, or rejection justifications..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="min-h-[120px] bg-background/50 text-sm"
                  disabled={isMutating || releaseStatus === "APPROVED" || releaseStatus === "SHIPPED"}
                />
              </div>

              {/* Context Actions */}
              <div className="space-y-2.5 pt-2">
                {(releaseStatus === "NOT_READY" || releaseStatus === "REJECTED") && (
                  <Button
                    className="w-full gap-2"
                    onClick={handleRequestApproval}
                    disabled={isMutating}
                  >
                    {isMutating ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    Request Approval
                  </Button>
                )}

                {releaseStatus === "READY_FOR_APPROVAL" && (
                  <div className="flex flex-col gap-2.5">
                    <Button
                      variant="outline"
                      className="w-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300 gap-1.5"
                      onClick={handleApprove}
                      disabled={isMutating || !isChecklistComplete}
                    >
                      {approveMutation.isPending ? <Spinner className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve Release
                    </Button>

                    <Button
                      variant="destructive"
                      className="w-full gap-1.5"
                      onClick={handleReject}
                      disabled={isMutating || !comments.trim()}
                    >
                      {rejectMutation.isPending ? <Spinner className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      Reject Release
                    </Button>
                    {!comments.trim() && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        Comments are required to reject the release.
                      </p>
                    )}
                  </div>
                )}

                {releaseStatus === "APPROVED" && (
                  <Alert className="bg-emerald-500/10 border-emerald-500/25">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <AlertTitle className="text-emerald-400 text-xs font-semibold">Release Approved</AlertTitle>
                    <AlertDescription className="text-[11px] text-emerald-500/90 mt-1">
                      This release has been approved and is authorized for deployment/shipping.
                    </AlertDescription>
                  </Alert>
                )}

                {releaseStatus === "SHIPPED" && (
                  <Alert className="bg-purple-500/10 border-purple-500/25">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    <AlertTitle className="text-purple-400 text-xs font-semibold">Release Shipped</AlertTitle>
                    <AlertDescription className="text-[11px] text-purple-500/90 mt-1">
                      This feature version has been shipped to production.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
