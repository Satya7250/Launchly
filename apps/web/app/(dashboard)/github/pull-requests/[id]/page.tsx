"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Label } from "~/components/ui/label";
import {
  GitPullRequest,
  GitBranch,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  Plus,
  Minus,
  FileCode,
  AlertTriangle,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "~/lib/utils";

// Helper to extract a single file's diff from the full PR diff text
function extractFileDiff(fullDiff: string, filename: string): string {
  const lines = fullDiff.split("\n");
  const fileLines: string[] = [];
  let tracking = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.startsWith("diff --git ")) {
      if (tracking) {
        break; // Reached next file
      }
      // Match file name in format: diff --git a/path/to/file b/path/to/file
      const searchPattern = ` b/${filename}`;
      const searchPatternQuoted = ` b/"${filename}"`;
      if (line.includes(searchPattern) || line.includes(searchPatternQuoted)) {
        tracking = true;
      }
    }

    if (tracking) {
      fileLines.push(line);
    }
  }

  return fileLines.join("\n");
}

export default function PullRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const prId = params.id as string;

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fetchedFullDiff, setFetchedFullDiff] = useState<string | null>(null);
  const [isFetchingDiff, setIsFetchingDiff] = useState(false);

  // Fetch PR by ID
  const { data: prEnvelope, isLoading, error } = trpc.github.pullRequestById.useQuery(
    { id: prId },
    { enabled: !!prId }
  );

  const prDetails = prEnvelope?.data;
  const pr = prDetails?.pullRequest;
  const repo = prDetails?.repository;
  const files = prDetails?.files ?? [];

  // Lazy fetch full PR diff on demand for large patches
  const diffQuery = trpc.github.pullRequestDiff.useQuery(
    { id: prId },
    { enabled: isFetchingDiff }
  );

  useEffect(() => {
    if (diffQuery.data?.data?.diff) {
      setFetchedFullDiff(diffQuery.data.data.diff);
      setIsFetchingDiff(false);
      toast.success("PR diff loaded on-demand successfully!");
    }
  }, [diffQuery.data]);

  // Handle default file selection
  useEffect(() => {
    const firstFile = files[0];
    if (firstFile && !selectedFileId) {
      setSelectedFileId(firstFile.id);
    }
  }, [files, selectedFileId]);

  const loadDiffOnDemand = () => {
    setIsFetchingDiff(true);
  };

  const selectedFile = files.find((f) => f.id === selectedFileId);

  // Get patch content to show
  let patchContent = selectedFile?.patch;
  let isLargeFile = false;

  if (selectedFile && !selectedFile.patch) {
    // If it was created, modified, or removed, and patch is null, it's a large file
    if (selectedFile.status !== "binary") {
      isLargeFile = true;
      if (fetchedFullDiff) {
        patchContent = extractFileDiff(fetchedFullDiff, selectedFile.filename);
      }
    }
  }

  const renderDiffLine = (line: string, index: number) => {
    let bgColor = "hover:bg-accent/5";
    let textColor = "text-foreground/90";
    if (line.startsWith("+")) {
      bgColor = "bg-emerald-500/10 hover:bg-emerald-500/15 border-l-2 border-emerald-500";
      textColor = "text-emerald-400";
    } else if (line.startsWith("-")) {
      bgColor = "bg-red-500/10 hover:bg-red-500/15 border-l-2 border-red-500";
      textColor = "text-red-400";
    } else if (line.startsWith("@@")) {
      bgColor = "bg-primary/5 text-primary/80 font-semibold";
      textColor = "text-primary/70";
    }

    return (
      <div key={index} className={`font-mono text-xs py-0.5 px-4 whitespace-pre-wrap ${bgColor} ${textColor}`}>
        {line}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="text-center py-20 flex flex-col items-center justify-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <h3 className="text-lg font-semibold">Failed to load pull request</h3>
        <p className="text-sm text-muted-foreground">{error?.message || "Pull request not found."}</p>
        <Button onClick={() => router.push("/github/pull-requests")}>
          Back to Pull Requests
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="flex flex-col gap-4 border-b border-border/20 pb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/github/pull-requests")}
            className="gap-1 p-0 h-auto hover:bg-transparent hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to list
          </Button>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-foreground/80">{repo?.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground/90">
                {pr.title}
              </h1>
              <span className="text-xl text-muted-foreground font-light">#{pr.number}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <GitPullRequest className="h-3.5 w-3.5" /> {pr.state.toUpperCase()}
              </span>
              <span className="flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" /> {pr.baseBranch} ← {pr.branch}
              </span>
              <span>by @{pr.author}</span>
              <span>• Synced {formatDate(pr.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a href={pr.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 bg-card/40 border-border/60">
                View on GitHub <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>

        {/* Sync Lifecycle Alert */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/30 bg-card/25 backdrop-blur-md mt-2">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
              Processing Status:
            </span>
            {pr.processingStatus === "RECEIVED" && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                RECEIVED (PR details created)
              </span>
            )}
            {pr.processingStatus === "PROCESSING" && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                PROCESSING (Fetching diffs and file mappings...)
              </span>
            )}
            {pr.processingStatus === "READY_FOR_AI_REVIEW" && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                READY FOR AI REVIEW (PR ingest completed)
              </span>
            )}
            {pr.processingStatus === "FAILED" && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                FAILED (Ingest failed)
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Commit SHA: <span className="font-mono text-foreground/95 bg-muted/40 px-1 py-0.5 rounded">{pr.headSha?.slice(0, 7) || "N/A"}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Changed Files List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
            Changed Files ({files.length})
          </h3>
          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="divide-y divide-border/25 max-h-[580px] overflow-y-auto scrollbar-thin">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full text-left p-3 flex items-center justify-between text-xs transition-colors border-l-2 ${
                    selectedFileId === file.id
                      ? "bg-accent/15 border-primary"
                      : "hover:bg-accent/5 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileCode className={`h-4 w-4 shrink-0 ${selectedFileId === file.id ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="truncate font-mono font-medium text-foreground/80">
                      {file.filename.split("/").pop()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted-foreground truncate font-mono max-w-[80px] hidden md:inline">
                      {file.filename.substring(0, file.filename.lastIndexOf("/"))}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/40">
                      <span className="text-emerald-500 flex items-center"><Plus className="h-2.5 w-2.5" />{file.additions}</span>
                      <span className="text-red-500 flex items-center"><Minus className="h-2.5 w-2.5" />{file.deletions}</span>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Diff Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Diff Viewer
            </h3>
            {selectedFile && (
              <span className="text-xs font-mono text-muted-foreground truncate max-w-sm">
                {selectedFile.filename}
              </span>
            )}
          </div>

          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl overflow-hidden min-h-[400px] flex flex-col">
            {selectedFile ? (
              <>
                <div className="bg-muted/30 border-b border-border/25 px-4 py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-foreground/80 truncate max-w-md">
                      {selectedFile.filename}
                    </span>
                    <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {selectedFile.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-500 font-semibold flex items-center">+{selectedFile.additions} additions</span>
                    <span className="text-red-500 font-semibold flex items-center">-{selectedFile.deletions} deletions</span>
                  </div>
                </div>

                <div className="flex-1 overflow-auto bg-[#0a0a0c]/85 max-h-[520px]">
                  {isLargeFile && !patchContent ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full space-y-4">
                      <AlertTriangle className="h-8 w-8 text-amber-500" />
                      <div className="space-y-1">
                        <p className="font-semibold text-sm">Large patch not persisted in DB</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          To save database storage, patches for files larger than 20KB are fetched on-demand.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={loadDiffOnDemand}
                        disabled={diffQuery.isLoading}
                        className="gap-1.5"
                      >
                        {diffQuery.isLoading ? (
                          <Spinner className="h-3.5 w-3.5" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Load Large Diff on Demand
                      </Button>
                    </div>
                  ) : selectedFile.status === "binary" ? (
                    <div className="flex items-center justify-center p-12 text-center text-xs text-muted-foreground h-full">
                      Binary file changes are not displayed.
                    </div>
                  ) : !patchContent ? (
                    <div className="flex items-center justify-center p-12 text-center text-xs text-muted-foreground h-full">
                      No changes or patch available.
                    </div>
                  ) : (
                    <pre className="py-3 select-text whitespace-pre overflow-x-auto">
                      {patchContent.split("\n").map((line, idx) => renderDiffLine(line, idx))}
                    </pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center text-xs text-muted-foreground flex-1">
                Select a file to view its changes.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
