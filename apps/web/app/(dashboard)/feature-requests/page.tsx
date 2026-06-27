"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "~/trpc/client";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { FileText, Plus, Search, Calendar, ArrowRight, Layers } from "lucide-react";
import Link from "next/link";
import { formatDate as formatUtilityDate } from "~/lib/utils";

export default function FeatureRequestsPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId") || undefined;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  // Query feature requests
  const { data: envelope, isLoading } = trpc.featureRequest.list.useQuery(
    projectIdParam ? { projectId: projectIdParam } : undefined
  );
  const requests = envelope?.data ?? [];

  // Query projects for filter heading if filter param is active
  const { data: projectsEnvelope } = trpc.project.list.useQuery();
  const projects = projectsEnvelope?.data ?? [];
  const activeFilterProject = projects.find((p) => p.id === projectIdParam);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
      case "CLARIFICATION_REQUIRED":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
      case "READY_FOR_PRD":
        return "bg-green-500/10 text-green-500 border border-green-500/20";
      case "PRD_GENERATED":
        return "bg-purple-500/10 text-purple-500 border border-purple-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "CLARIFICATION_REQUIRED") {
      return "NEEDS CLARIFICATION";
    }
    return status;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-500/10 text-red-500 border border-red-500/20";
      case "HIGH":
        return "bg-orange-500/10 text-orange-500 border border-orange-500/20";
      case "MEDIUM":
        return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ||
      r.status === statusFilter ||
      (statusFilter === "NEEDS_CLARIFICATION" && r.status === "CLARIFICATION_REQUIRED");

    const matchesPriority = priorityFilter === "ALL" || r.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const formatDate = (dateStr: string) => formatUtilityDate(dateStr);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Requests</h1>
          <p className="text-sm text-muted-foreground">
            {activeFilterProject
              ? `Showing requests for project: ${activeFilterProject.name}`
              : "Review, filter, and analyze requirement inputs."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projectIdParam && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/feature-requests">Clear Project Filter</Link>
            </Button>
          )}
          <Button size="sm" asChild className="gap-2">
            <Link href="/feature-requests/new">
              <Plus className="h-4 w-4" /> New Request
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-card/20 p-4 border border-border/40 rounded-xl backdrop-blur-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background/50 border-border/60"
          />
        </div>

        {/* Status Filter */}
        <div className="flex flex-col w-full md:w-48 gap-1">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-background/50 border-border/60">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-card/90 border-border/60">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="NEW">New</SelectItem>
              <SelectItem value="NEEDS_CLARIFICATION">Needs Clarification</SelectItem>
              <SelectItem value="READY_FOR_PRD">Ready for PRD</SelectItem>
              <SelectItem value="PRD_GENERATED">PRD Generated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="flex flex-col w-full md:w-48 gap-1">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="bg-background/50 border-border/60">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent className="bg-card/90 border-border/60">
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Requests Grid */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/60 rounded-xl bg-card/10 flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <FileText className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">No Feature Requests Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {search || statusFilter !== "ALL" || priorityFilter !== "ALL"
                ? "No requests match the selected filters. Try adjusting your search term or criteria."
                : "Create a feature request to start gathering requirements."}
            </p>
          </div>
          {!(search || statusFilter !== "ALL" || priorityFilter !== "ALL") && (
            <Button asChild>
              <Link href="/feature-requests/new">Create First Request</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((req) => (
            <Card key={req.id} className="border border-border/40 bg-card/60 hover:bg-accent/10 transition-all flex flex-col md:flex-row items-start md:items-center justify-between p-5 gap-4 group">
              <div className="space-y-2 truncate max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-primary flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    {req.project.name}
                  </span>
                  <span className="text-muted-foreground/60 text-xs">•</span>
                  <Badge variant="outline" className={`${getStatusColor(req.status)} text-[10px] tracking-wide font-bold uppercase py-0.5 px-1.5`}>
                    {getStatusLabel(req.status)}
                  </Badge>
                  <Badge variant="outline" className={`${getPriorityColor(req.priority)} text-[10px] tracking-wide font-bold uppercase py-0.5 px-1.5`}>
                    {req.priority}
                  </Badge>
                  <span className="text-muted-foreground/60 text-xs">•</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 px-1 rounded">
                    Source: {req.source}
                  </span>
                </div>
                <h3 className="text-lg font-bold group-hover:text-primary transition-colors truncate">
                  {req.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1 truncate">
                  {req.description}
                </p>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto shrink-0 border-t border-border/30 pt-3 md:border-t-0 md:pt-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created {formatDate(req.createdAt)}</span>
                </div>
                <Button size="sm" variant="ghost" asChild className="group-hover:text-primary transition-colors">
                  <Link href={`/feature-requests/${req.id}`} className="gap-1.5">
                    <span>Inspect</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
