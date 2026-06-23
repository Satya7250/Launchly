"use client";

import React, { useEffect, useState } from "react";
import { useWorkspace } from "~/providers/workspace-context";
import { useRouter } from "next/navigation";
import { Spinner } from "~/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Building2,
  ChevronsUpDown,
  Plus,
  LogOut,
  FolderKanban,
  FileText,
  CheckSquare,
  Shield,
  HelpCircle,
  Menu,
  Brain,
  Github,
  GitPullRequest,
} from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, activeWorkspace, workspaces, isLoading, switchWorkspace, createWorkspace, signOut } = useWorkspace();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Redirection Guards
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (!activeWorkspace) {
        router.push("/workspace/select");
      }
    }
  }, [user, activeWorkspace, isLoading, router]);

  if (isLoading || !user || !activeWorkspace) {
    return (
      <div className="min-h-screen min-w-screen flex justify-center items-center bg-background">
        <Spinner />
      </div>
    );
  }

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

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "US";

  return (
    <div className="min-h-screen w-full flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/40 bg-card/30 backdrop-blur-md hidden md:flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          {/* Workspace Switcher */}
          <div className="space-y-1">
            <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Workspace
            </Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between gap-2 px-3 bg-background/50 border-border/60 hover:bg-accent/40 text-left h-11">
                  <div className="flex items-center gap-2 truncate">
                    <div className="p-1 rounded bg-primary/10 text-primary shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="font-semibold truncate text-sm">
                      {activeWorkspace.name}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 border border-border/60 bg-card/90 backdrop-blur-md" align="start">
                <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {workspaces.map((item) => (
                  <DropdownMenuItem
                    key={item.workspace.id}
                    onClick={() => switchWorkspace(item.workspace.id)}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="truncate">{item.workspace.name}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase bg-muted/40 px-1 rounded">
                      {item.role.slice(0, 3)}
                    </span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDialogOpen(true)}
                  className="flex items-center gap-2 cursor-pointer text-primary focus:text-primary"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Workspace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all">
              <FolderKanban className="h-4 w-4 text-primary" />
              <span>Overview</span>
            </Link>
            <Link href="/projects" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all">
              <Building2 className="h-4 w-4" />
              <span>Projects</span>
            </Link>
            <Link href="/feature-requests" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all">
              <FileText className="h-4 w-4" />
              <span>Feature Requests</span>
            </Link>
            <Link href="/prds" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all">
              <Brain className="h-4 w-4" />
              <span>PRDs</span>
            </Link>
            <Link href="/github" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all">
              <Github className="h-4 w-4" />
              <span>GitHub Integration</span>
            </Link>
            <Link href="/github/pull-requests" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all">
              <GitPullRequest className="h-4 w-4" />
              <span>Pull Requests</span>
            </Link>
            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all cursor-not-allowed">
              <CheckSquare className="h-4 w-4" />
              <span>Tasks</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all cursor-not-allowed">
              <Shield className="h-4 w-4" />
              <span>Access Control</span>
            </div>
          </nav>
        </div>

        {/* User Account / Footer */}
        <div className="space-y-4 pt-4 border-t border-border/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 truncate">
              <Avatar className="h-9 w-9 border border-border/60">
                {user.image ? <AvatarImage src={user.image} /> : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="truncate">
                <p className="text-sm font-semibold truncate leading-tight">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate leading-none mt-1">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border/40 flex items-center justify-between px-6 shrink-0 bg-card/10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {activeWorkspace.name} Dashboard
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto p-6 md:p-8 bg-background/50">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                <Label htmlFor="dial-w-name">Workspace Name</Label>
                <Input
                  id="dial-w-name"
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
  );
}
