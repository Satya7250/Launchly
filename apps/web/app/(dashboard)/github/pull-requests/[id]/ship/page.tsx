"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "~/trpc/client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  ArrowLeft,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  History,
  User,
  Calendar,
  Tag,
  FileText,
  ShieldCheck,
  GitPullRequest,
  Sparkles,
  ClipboardList,
  Lock,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "~/lib/utils";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/10 last:border-0">
      <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <span className="text-muted-foreground/70">{icon}</span>
        {label}
      </div>
      <div className="text-sm font-medium text-right">{children}</div>
    </div>
  );
}

function ShipAuditEntry({
  entry,
}: {
  entry: {
    id: string;
    shippedBy: string | null;
    releaseVersion: string | null;
    notes: string | null;
    shippedAt: Date | string;
  };
}) {
  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* Timeline dot */}
      <span className="absolute left-0 top-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/40">
        <Rocket className="h-2.5 w-2.5 text-purple-400" />
      </span>

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-foreground/90">Release Shipped</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-mono text-muted-foreground">{formatDate(entry.shippedAt)}</span>
          {entry.releaseVersion && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-purple-500/10 text-purple-400 border-purple-500/20">
              {entry.releaseVersion}
            </Badge>
          )}
        </div>

        {entry.notes && (
          <p className="text-xs text-foreground/80 bg-muted/20 p-2.5 rounded border border-border/10 italic whitespace-pre-wrap max-w-2xl">
            &ldquo;{entry.notes}&rdquo;
          </p>
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <User className="h-3 w-3" />
          <span>Shipped by: {entry.shippedBy ?? "Unknown"}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShipReleasePage() {
  const params = useParams();
  const router = useRouter();
  const prId = params.id as string;

  const [releaseVersion, setReleaseVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ── Data queries ─────────────────────────────────────────────────────────
  const { data: prEnvelope, isLoading: isPrLoading } = trpc.github.pullRequestById.useQuery(
    { id: prId },
    { enabled: !!prId }
  );

  const {
    data: approvalEnvelope,
    isLoading: isApprovalLoading,
  } = trpc.approval.status.useQuery(
    { pullRequestId: prId },
    { enabled: !!prId }
  );

  const {
    data: shipStatusEnvelope,
    isLoading: isShipStatusLoading,
    refetch: refetchShipStatus,
  } = trpc.ship.status.useQuery(
    { pullRequestId: prId },
    { enabled: !!prId }
  );

  const {
    data: shipHistoryEnvelope,
    isLoading: isShipHistoryLoading,
    refetch: refetchShipHistory,
  } = trpc.ship.history.useQuery(
    { pullRequestId: prId },
    { enabled: !!prId }
  );

  // ── Mutation ──────────────────────────────────────────────────────────────
  const shipMutation = trpc.ship.ship.useMutation();

  // ── Derived state ─────────────────────────────────────────────────────────
  const pr = prEnvelope?.data?.pullRequest;
  const repo = prEnvelope?.data?.repository;
  const approvalStatus = approvalEnvelope?.data;
  const shipStatus = shipStatusEnvelope?.data;
  const shipHistory = shipHistoryEnvelope?.data ?? [];

  const isLoading =
    isPrLoading || isApprovalLoading || isShipStatusLoading || isShipHistoryLoading;

  const releaseStatus = shipStatus?.releaseStatus ?? "NOT_READY";
  const isApproved = releaseStatus === "APPROVED";
  const isShipped = releaseStatus === "SHIPPED";
  const isShipping = shipMutation.isPending;

  const checklist = approvalStatus?.checklist;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleShip = async () => {
    setConfirmOpen(false);
    try {
      await shipMutation.mutateAsync({
        pullRequestId: prId,
        releaseVersion: releaseVersion.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("🚀 Release shipped successfully!");
      setReleaseVersion("");
      setNotes("");
      refetchShipStatus();
      refetchShipHistory();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to ship release");
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 border-b border-border/20 pb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/github/pull-requests/${prId}/release-approval`)}
            className="gap-1 p-0 h-auto hover:bg-transparent hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Release Approval
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground/90 flex items-center gap-3">
              <Rocket className="h-7 w-7 text-purple-400" />
              Ship Release
              <span className="text-xl text-muted-foreground font-light">#{pr.number}</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {pr.title}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isShipped ? (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 gap-1.5 px-3 py-1 text-xs font-semibold">
                <Rocket className="h-3 w-3" /> SHIPPED
              </Badge>
            ) : isApproved ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1.5 px-3 py-1 text-xs font-semibold">
                <CheckCircle2 className="h-3 w-3" /> APPROVED — Ready to Ship
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs">
                <Lock className="h-3 w-3" /> {releaseStatus}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left: Release Summary ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Release Summary Card */}
          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-5 w-5 text-primary" />
                Release Summary
              </CardTitle>
              <CardDescription>
                Full pipeline status for <span className="font-mono text-foreground/80">{repo?.name}</span> PR #{pr.number}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6">
              <SummaryRow icon={<GitPullRequest className="h-4 w-4" />} label="Pull Request">
                <span className="font-mono text-xs text-foreground/70">#{pr.number} — {pr.branch}</span>
              </SummaryRow>

              <SummaryRow icon={<FileText className="h-4 w-4" />} label="PRD">
                {checklist?.prdExists ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px]">
                    ✓ Linked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[11px]">
                    Missing
                  </Badge>
                )}
              </SummaryRow>

              <SummaryRow icon={<ClipboardList className="h-4 w-4" />} label="Engineering Tasks">
                {checklist?.tasksExist ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px]">
                    ✓ Generated
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[11px]">
                    Missing
                  </Badge>
                )}
              </SummaryRow>

              <SummaryRow icon={<Sparkles className="h-4 w-4" />} label="AI Review">
                {checklist?.aiReviewCompleted ? (
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px]">
                      ✓ Completed
                    </Badge>
                    {checklist.blockingFindingsCount === 0 ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px]">
                        0 Blocking
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[11px]">
                        {checklist.blockingFindingsCount} Blocking
                      </Badge>
                    )}
                  </span>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[11px]">
                    Not Completed
                  </Badge>
                )}
              </SummaryRow>

              <SummaryRow icon={<ShieldCheck className="h-4 w-4" />} label="Human Approval">
                {releaseStatus === "APPROVED" || releaseStatus === "SHIPPED" ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[11px]">
                    ✓ Approved
                  </Badge>
                ) : releaseStatus === "READY_FOR_APPROVAL" ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[11px]">
                    Pending Decision
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[11px]">
                    Not Requested
                  </Badge>
                )}
              </SummaryRow>

              {isShipped && shipStatus?.shippedAt && (
                <SummaryRow icon={<Calendar className="h-4 w-4" />} label="Shipped At">
                  <span className="text-xs font-mono text-foreground/80">
                    {formatDate(shipStatus.shippedAt)}
                  </span>
                </SummaryRow>
              )}

              {isShipped && shipStatus?.releaseVersion && (
                <SummaryRow icon={<Tag className="h-4 w-4" />} label="Release Version">
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono text-[11px]">
                    {shipStatus.releaseVersion}
                  </Badge>
                </SummaryRow>
              )}
            </CardContent>
          </Card>

          {/* Post-ship success banner */}
          {isShipped && (
            <Alert className="bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/5">
              <Rocket className="h-5 w-5 text-purple-400" />
              <AlertTitle className="text-purple-300 font-bold text-base">
                ✅ Successfully Shipped
              </AlertTitle>
              <AlertDescription className="text-sm text-purple-400/90 space-y-1.5 mt-1">
                <p>This release has been deployed to production and the full pipeline is complete.</p>
                <div className="flex flex-wrap gap-4 mt-2 text-xs">
                  {shipStatus?.shippedBy && (
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Shipped by: <code className="bg-purple-500/10 px-1 py-0.5 rounded font-mono">{shipStatus.shippedBy}</code>
                    </span>
                  )}
                  {shipStatus?.shippedAt && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      At: <code className="bg-purple-500/10 px-1 py-0.5 rounded font-mono">{formatDate(shipStatus.shippedAt)}</code>
                    </span>
                  )}
                  {shipStatus?.releaseVersion && (
                    <span className="flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" />
                      Version: <code className="bg-purple-500/10 px-1 py-0.5 rounded font-mono">{shipStatus.releaseVersion}</code>
                    </span>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Ship Audit History */}
          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5 text-primary" />
                Ship Audit Trail
              </CardTitle>
              <CardDescription>
                Immutable, chronological log of all ship events. Records are never modified.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shipHistory.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  No ship events recorded yet.
                </div>
              ) : (
                <div className="relative border-l border-border/40 pl-2 ml-2 space-y-2">
                  {shipHistory.map((entry) => (
                    <ShipAuditEntry key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Ship Panel ───────────────────────────────────────────── */}
        <div>
          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Rocket className="h-5 w-5 text-primary" />
                Ship Panel
              </CardTitle>
              <CardDescription>
                Mark this release as shipped to production.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* APPROVED — show ship form */}
              {isApproved && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ship-release-version" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Release Version <span className="text-muted-foreground/50 normal-case font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="ship-release-version"
                      placeholder="e.g. v1.2.3"
                      value={releaseVersion}
                      onChange={(e) => setReleaseVersion(e.target.value)}
                      maxLength={100}
                      className="bg-background/50 text-sm font-mono"
                      disabled={isShipping}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ship-notes" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Release Notes <span className="text-muted-foreground/50 normal-case font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="ship-notes"
                      placeholder="Describe what's included in this release..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={4000}
                      className="min-h-[100px] bg-background/50 text-sm"
                      disabled={isShipping}
                    />
                  </div>

                  {/* Confirmation Dialog */}
                  <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                    <DialogTrigger asChild>
                      <Button
                        id="ship-release-btn"
                        className="w-full gap-2 bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-lg shadow-purple-500/20 transition-all duration-200"
                        disabled={isShipping}
                      >
                        {isShipping ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          <Rocket className="h-4 w-4" />
                        )}
                        🚀 Ship Release
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Rocket className="h-5 w-5 text-purple-400" />
                          Confirm Ship
                        </DialogTitle>
                        <DialogDescription className="space-y-3 pt-2">
                          <p>
                            Are you sure you want to mark this release as{" "}
                            <strong className="text-foreground">SHIPPED</strong>?
                          </p>
                          {(releaseVersion || notes) && (
                            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-xs border border-border/20">
                              {releaseVersion && (
                                <div className="flex items-center gap-2">
                                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">Version:</span>
                                  <code className="font-mono font-semibold text-foreground/90">{releaseVersion}</code>
                                </div>
                              )}
                              {notes && (
                                <div className="flex items-start gap-2">
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <span className="text-muted-foreground italic">{notes.slice(0, 120)}{notes.length > 120 ? "…" : ""}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            This action will update the release status to SHIPPED and create an immutable audit record.
                          </p>
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setConfirmOpen(false)}
                          disabled={isShipping}
                        >
                          Cancel
                        </Button>
                        <Button
                          id="ship-confirm-btn"
                          onClick={handleShip}
                          disabled={isShipping}
                          className="bg-purple-600 hover:bg-purple-500 text-white border-0 gap-2"
                        >
                          {isShipping ? <Spinner className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
                          Confirm Ship
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </>
              )}

              {/* SHIPPED — success state */}
              {isShipped && (
                <Alert className="bg-purple-500/10 border-purple-500/25">
                  <Rocket className="h-4 w-4 text-purple-400" />
                  <AlertTitle className="text-purple-300 text-xs font-bold">Release Shipped</AlertTitle>
                  <AlertDescription className="text-[11px] text-purple-400/90 mt-1 space-y-1">
                    <p>This release has been marked as shipped to production.</p>
                    {shipStatus?.shippedAt && (
                      <p className="font-mono">{formatDate(shipStatus.shippedAt)}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* NOT_READY / REJECTED / READY_FOR_APPROVAL — locked state */}
              {!isApproved && !isShipped && (
                <Alert className="bg-muted/30 border-border/20">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <AlertTitle className="text-muted-foreground text-xs font-bold">Shipping Locked</AlertTitle>
                  <AlertDescription className="text-[11px] text-muted-foreground/80 mt-1">
                    This release must be in <strong>APPROVED</strong> state before it can be shipped.
                    Current status: <code className="font-mono">{releaseStatus}</code>
                  </AlertDescription>
                </Alert>
              )}

              {/* Navigation links */}
              <div className="pt-2 border-t border-border/20 space-y-2">
                <Link href={`/github/pull-requests/${prId}/release-approval`}>
                  <Button variant="outline" size="sm" className="w-full gap-1.5 bg-card/40 border-border/60 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Release Approval
                  </Button>
                </Link>
                <Link href={`/github/pull-requests/${prId}`}>
                  <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs text-muted-foreground">
                    <GitPullRequest className="h-3.5 w-3.5" />
                    View Pull Request
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
