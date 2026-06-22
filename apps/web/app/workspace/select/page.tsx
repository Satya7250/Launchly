"use client";

import React, { useState } from "react";
import { useWorkspace } from "~/providers/workspace-context";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Plus, Building2, LogOut, ArrowRight } from "lucide-react";

export default function WorkspaceSelectPage() {
  const { user, workspaces, isLoading, switchWorkspace, createWorkspace, signOut } = useWorkspace();
  const [workspaceName, setWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setIsCreating(true);
    try {
      await createWorkspace(workspaceName);
      setWorkspaceName("");
      setDialogOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen min-w-screen flex justify-center items-center bg-background">
        <Spinner />
      </div>
    );
  }

  // If not logged in, show a simple prompt or let them redirect
  if (!user) {
    return (
      <div className="min-h-screen min-w-screen flex justify-center items-center bg-background text-foreground p-4">
        <Card className="max-w-md w-full border border-border/40 bg-card/60 backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You must be signed in to access this page.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => window.location.href = "/login"}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-muted/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Welcome, {user.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Select an existing workspace or create a new one to begin.
            </p>
          </div>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((item) => (
            <Card
              key={item.workspace.id}
              className="border border-border/40 bg-card/60 hover:bg-accent/40 hover:border-accent-foreground/30 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
              onClick={() => switchWorkspace(item.workspace.id)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-all">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors">
                      {item.workspace.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">Role: {item.role.toLowerCase()}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent />
              <CardFooter className="flex items-center justify-end text-xs text-muted-foreground group-hover:text-primary transition-colors pb-4">
                <span>Enter workspace</span>
                <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </CardFooter>
            </Card>
          ))}

          {/* Create Workspace Dialog Card */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Card className="border border-dashed border-border/80 hover:border-primary/60 bg-transparent hover:bg-primary/5 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-8 min-h-[140px] text-center group">
                <div className="p-3 rounded-full bg-muted/20 group-hover:bg-primary/10 transition-colors mb-3">
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                </div>
                <span className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                  Create New Workspace
                </span>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] border border-border/60 bg-card/90 backdrop-blur-md">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Create Workspace</DialogTitle>
                  <DialogDescription>
                    Create a new hub to manage your projects, repositories, and releases.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="w-name">Workspace Name</Label>
                    <Input
                      id="w-name"
                      placeholder="Acme Corp"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      className="bg-background/50"
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating || !workspaceName.trim()}>
                    {isCreating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Create Workspace
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {workspaces.length === 0 && (
          <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-card/20">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <h3 className="text-lg font-medium text-foreground mb-1">No workspaces found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              It looks like you aren&apos;t a member of any workspaces yet. Create one to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
