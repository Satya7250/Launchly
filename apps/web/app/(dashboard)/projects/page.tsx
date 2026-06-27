"use client";

import React, { useState } from "react";
import { trpc } from "~/trpc/client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { FolderGit2, Plus, Calendar, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDate } from "~/lib/utils";

export default function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Query projects
  const { data: projectsEnvelope, isLoading, refetch } = trpc.project.list.useQuery();
  const projects = projectsEnvelope?.data ?? [];

  // Mutation
  const createMutation = trpc.project.create.useMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    setIsCreating(true);
    try {
      await createMutation.mutateAsync({
        name: projectName,
        description: projectDesc || undefined,
      });
      toast.success("Project created successfully!");
      setProjectName("");
      setProjectDesc("");
      setDialogOpen(false);
      await refetch();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your workspace modules and development deliverables.
          </p>
        </div>
        {projects.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border border-border/60 bg-card/90 backdrop-blur-md">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>New Project</DialogTitle>
                  <DialogDescription>
                    Create a project area to organize requirement cards and pull requests.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="proj-name">Project Name</Label>
                    <Input
                      id="proj-name"
                      placeholder="ShipFlow Core UI"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="bg-background/50"
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="proj-desc">Description (Optional)</Label>
                    <Textarea
                      id="proj-desc"
                      placeholder="Development sprint for the frontend component architecture."
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || !projectName.trim()}>
                    {isCreating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Create Project
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Empty State */}
      {projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/60 rounded-xl bg-card/10 flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <FolderGit2 className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Create Your First Project</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Projects help bundle feature requests and releases together. Add a project to get started.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create First Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border border-border/60 bg-card/90 backdrop-blur-md">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>New Project</DialogTitle>
                  <DialogDescription>
                    Create a project area to organize requirement cards.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="proj-name-empty">Project Name</Label>
                    <Input
                      id="proj-name-empty"
                      placeholder="ShipFlow Core UI"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="bg-background/50"
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="proj-desc-empty">Description (Optional)</Label>
                    <Textarea
                      id="proj-desc-empty"
                      placeholder="Development sprint for the frontend component architecture."
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || !projectName.trim()}>
                    {isCreating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Create Project
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="border border-border/40 bg-card/60 hover:bg-accent/10 transition-all flex flex-col justify-between group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1 min-h-[40px]">
                      {project.description || "No description provided."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created {formatDate(project.createdAt)}</span>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/30 pt-3 flex items-center justify-between">
                <Link
                  href={`/feature-requests?projectId=${project.id}`}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary flex items-center gap-1 group-hover:text-primary transition-colors"
                >
                  <span>View feature requests</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
