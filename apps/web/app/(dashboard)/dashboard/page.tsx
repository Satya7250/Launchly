"use client";

import React from "react";
import { useWorkspace } from "~/providers/workspace-context";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Building2, ShieldAlert, ShieldCheck, User, Calendar, Shield } from "lucide-react";
import { formatDate as formatUtilityDate } from "~/lib/utils";

export default function DashboardOverviewPage() {
  const { activeWorkspace, activeRole, user } = useWorkspace();

  if (!activeWorkspace) return null;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "OWNER":
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case "ADMIN":
        return <ShieldCheck className="h-5 w-5 text-amber-500" />;
      default:
        return <User className="h-5 w-5 text-blue-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER":
        return "destructive";
      case "ADMIN":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatDate = (dateStr: string) => formatUtilityDate(dateStr, { month: "long" });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace Overview</h1>
        <p className="text-sm text-muted-foreground">
          View your current subscription, workspace configuration, and access controls.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workspace Card */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Workspace Details</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-extrabold">{activeWorkspace.name}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Slug: {activeWorkspace.slug}</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created {formatDate(activeWorkspace.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* User Card */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Your Membership</CardTitle>
            {getRoleIcon(activeRole)}
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-extrabold flex items-center gap-2">
                {user.name}
                <Badge variant={getRoleBadgeVariant(activeRole)} className="text-[10px] py-0.5">
                  {activeRole}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Plan / Status Card */}
        <Card className="border border-border/40 bg-card/60 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-semibold">Workspace Tier</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-2xl font-extrabold text-green-600 dark:text-green-400">Free Tier</div>
              <p className="text-xs text-muted-foreground mt-0.5">Upgrade for team access & advanced AI audits.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Guide */}
      <Card className="border border-border/40 bg-card/40">
        <CardHeader>
          <CardTitle className="text-lg">Access Control & Role Guide</CardTitle>
          <CardDescription>
            Understanding permissions and scopes assigned to roles in this tenant organization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
              <span className="text-xs font-bold text-red-500 uppercase">Owner</span>
              <p className="text-xs text-muted-foreground">
                Full resource management authority, billing config, billing upgrade initialization, member invitations, and deletion capability.
              </p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <span className="text-xs font-bold text-amber-500 uppercase">Admin</span>
              <p className="text-xs text-muted-foreground">
                Can write and configure projects, hook repository webhooks, manage feature requests, write PRDs, and view billing history.
              </p>
            </div>
            <div className="space-y-1 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <span className="text-xs font-bold text-blue-500 uppercase">Member</span>
              <p className="text-xs text-muted-foreground">
                Read-only overview dashboard, can view active AI reviews score, review pull request diff feedback, and log engineering tasks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
