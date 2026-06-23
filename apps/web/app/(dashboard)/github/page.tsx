"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Label } from "~/components/ui/label";
import {
  Github,
  Plus,
  GitBranch,
  Lock,
  Globe,
  Settings,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDate } from "~/lib/utils";

export default function GithubIntegrationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawInstallationId = searchParams.get("installation_id");
  const installationIdParam = rawInstallationId ? parseInt(rawInstallationId, 10) : null;

  const [selectedInstId, setSelectedInstId] = useState<number | null>(null);
  const [connectingRepoId, setConnectingRepoId] = useState<number | null>(null);

  // Fetch connected repos, installations list, and optionally available repos from GitHub
  const { data: reposEnvelope, isLoading, refetch } = trpc.github.repositories.useQuery(
    {
      fetchAvailableForInstallationId: selectedInstId || undefined,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const connectMutation = trpc.github.connect.useMutation();

  const connectedRepos = reposEnvelope?.data?.connected ?? [];
  const availableRepos = reposEnvelope?.data?.available ?? [];
  const installations = reposEnvelope?.data?.installations ?? [];

  // Automatically select the first installation if available and none selected
  useEffect(() => {
    const firstInst = installations[0];
    if (firstInst && !selectedInstId) {
      setSelectedInstId(firstInst.installationId);
    }
  }, [installations, selectedInstId]);

  // Handle successful GitHub callback installation redirect
  useEffect(() => {
    if (installationIdParam) {
      toast.success(`GitHub App installed successfully (ID: ${installationIdParam})!`);
      setSelectedInstId(installationIdParam);
      // Clean up URL query parameters
      router.replace("/github");
    }
  }, [installationIdParam, router]);

  const handleConnect = async (repo: typeof availableRepos[0]) => {
    setConnectingRepoId(repo.githubRepositoryId);
    try {
      await connectMutation.mutateAsync({
        installationId: repo.installationId,
        githubRepositoryId: repo.githubRepositoryId,
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        private: repo.private,
      });
      toast.success(`Connected repository ${repo.fullName} successfully!`);
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to connect repository");
    } finally {
      setConnectingRepoId(null);
    }
  };

  const GITHUB_APP_SLUG = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "launchly-app";
  const installUrl = `https://github.com/apps/${GITHUB_APP_SLUG}/installations/new`;

  if (isLoading && !reposEnvelope) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            GitHub Integration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect repositories to ingest pull requests and prepare for AI code reviews.
          </p>
        </div>
        <Button asChild className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary/75 text-white shadow-md shadow-primary/10">
          <a href={installUrl} target="_blank" rel="noopener noreferrer">
            <Github className="h-4 w-4" /> Install GitHub App <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connected Repositories List */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Connected Repositories
              </CardTitle>
              <CardDescription>
                Repositories active and tracking pull requests in this workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {connectedRepos.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border/60 rounded-lg bg-accent/5 flex flex-col items-center justify-center space-y-4">
                  <div className="p-3 rounded-full bg-muted/60 text-muted-foreground">
                    <Github className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">No repositories connected</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Connect available repositories from your installations to begin tracking pull requests.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/25">
                  {connectedRepos.map((repo) => (
                    <div key={repo.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0 group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded bg-muted/40 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {repo.private ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                            {repo.fullName}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <GitBranch className="h-3.5 w-3.5" /> {repo.defaultBranch || "main"}
                            </span>
                            <span>Connected {formatDate(repo.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Link href={`/github/pull-requests?repositoryId=${repo.id}`}>
                        <Button variant="outline" size="sm" className="hover:bg-accent/40 text-xs">
                          View PRs
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Installation Config / Connect New Repositories */}
        <div className="space-y-6">
          <Card className="border border-border/40 bg-card/45 backdrop-blur-md shadow-xl">
            <CardHeader className="border-b border-border/20 pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Connect Repository
              </CardTitle>
              <CardDescription>
                Select from available installations to list repositories you can connect.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {installations.length === 0 ? (
                <div className="space-y-4">
                  <div className="flex gap-2.5 p-3 rounded-lg border border-amber-500/25 bg-amber-500/5 text-amber-500 text-xs leading-normal">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">GitHub App Not Installed</p>
                      <p className="text-muted-foreground mt-0.5">
                        You need to authorize and install the Launchly GitHub App to your account or organization first.
                      </p>
                    </div>
                  </div>
                  <Button asChild className="w-full gap-2">
                    <a href={installUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4" /> Install Launchly App
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="inst-select" className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Active Installation
                    </Label>
                    <select
                      id="inst-select"
                      value={selectedInstId || ""}
                      onChange={(e) => setSelectedInstId(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/60 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40"
                    >
                      {installations.map((inst) => (
                        <option key={inst.id} value={inst.installationId}>
                          {inst.accountLogin} ({inst.accountType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider block mb-3">
                      Available Repositories
                    </Label>

                    {isLoading && selectedInstId ? (
                      <div className="flex justify-center items-center py-6">
                        <Spinner className="h-5 w-5" />
                      </div>
                    ) : availableRepos.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-md">
                        No repos available or all are connected.
                      </p>
                    ) : (
                      <div className="max-h-[320px] overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
                        {availableRepos
                          .filter((ar) => !connectedRepos.some((cr) => cr.githubRepoId === ar.githubRepositoryId))
                          .map((repo) => (
                            <div
                              key={repo.githubRepositoryId}
                              className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-background/30 hover:bg-accent/10 transition-colors"
                            >
                              <div className="min-w-0 mr-2">
                                <p className="text-xs font-semibold truncate text-foreground/90">
                                  {repo.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {repo.owner}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-[11px] font-semibold bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-white"
                                onClick={() => handleConnect(repo)}
                                disabled={connectingRepoId === repo.githubRepositoryId}
                              >
                                {connectingRepoId === repo.githubRepositoryId ? (
                                  <Spinner className="h-3 w-3 mr-1" />
                                ) : (
                                  <Plus className="h-3 w-3 mr-1" />
                                )}
                                Connect
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
