import React, { useState, useEffect } from "react";
import { trpc } from "~/trpc/client";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Spinner } from "~/components/ui/spinner";
import { toast } from "sonner";
import {
  Brain,
  Clock,
  Zap,
  Activity,
  Workflow,
  Sparkles,
  Trash2,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "~/components/ui/empty";

type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

interface KanbanTask {
  id: string;
  organizationId: string;
  prdId: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: string | null;
  position: number;
  version: number;
  metadata: {
    estimate?: string;
    complexity?: "LOW" | "MEDIUM" | "HIGH";
    dependencies?: string[];
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    confidence?: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

const COLUMNS = [
  { id: "BACKLOG" as const, title: "Backlog", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  { id: "TODO" as const, title: "Todo", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "IN_PROGRESS" as const, title: "In Progress", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { id: "IN_REVIEW" as const, title: "In Review", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "DONE" as const, title: "Done", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
];

// Reusable Droppable Column component
function KanbanColumn({
  id,
  title,
  color,
  tasks,
}: {
  id: TaskStatus;
  title: string;
  color: string;
  tasks: KanbanTask[];
}) {
  const { setNodeRef, isOver } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-[260px] rounded-xl border border-border/40 p-4 transition-colors duration-200 ${
        isOver ? "bg-accent/40 border-primary/30" : "bg-card/25 backdrop-blur-xl"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
            {title}
          </span>
          <span className="text-xs text-muted-foreground font-semibold">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 flex-1 overflow-y-auto max-h-[600px] min-h-[150px] pr-1">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 py-8 text-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg bg-card/10">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Sortable Task Card component
function SortableTaskCard({ task }: { task: KanbanTask }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "HIGH":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "MEDIUM":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group cursor-grab active:cursor-grabbing border border-border/40 hover:border-border bg-card/65 hover:bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
          {task.title}
        </h4>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {task.metadata && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/10">
          {task.metadata.priority && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-bold ${getPriorityColor(task.metadata.priority)}`}>
              {task.metadata.priority}
            </Badge>
          )}
          {task.metadata.estimate && (
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <Clock className="h-3 w-3" /> {task.metadata.estimate}
            </span>
          )}
          {task.metadata.complexity && (
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <Zap className="h-3 w-3" /> {task.metadata.complexity}
            </span>
          )}
          {task.metadata.confidence !== undefined && (
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <Activity className="h-3 w-3" /> {task.metadata.confidence}% conf
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function KanbanBoard({ prdId }: { prdId: string }) {
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [boardTasks, setBoardTasks] = useState<KanbanTask[]>([]);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);

  // tRPC Procedures
  const { data: versionsEnvelope, refetch: refetchVersions } = trpc.task.listVersions.useQuery({ prdId });
  const versions = versionsEnvelope?.data ?? [];

  // Poll generation status
  const statusEnvelope = trpc.task.getGenerationStatus.useQuery(
    { prdId },
    {
      refetchInterval: (query) => {
        const status = query?.state?.data?.data?.status;
        return status === "QUEUED" || status === "GENERATING" ? 2000 : false;
      },
    }
  );
  const generationStatus = statusEnvelope.data?.data?.status ?? "NOT_STARTED";
  const generationError = statusEnvelope.data?.data?.error;

  // If no version is selected yet and we have versions, set default to latest version (the first in the list)
  useEffect(() => {
    if (versions.length > 0 && selectedVersion === undefined) {
      setSelectedVersion(versions[0]);
    }
  }, [versions, selectedVersion]);

  // Fetch tasks for the selected version
  const {
    data: tasksEnvelope,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = trpc.task.list.useQuery(
    { prdId, version: selectedVersion },
    {
      enabled: !!prdId,
    }
  );

  const rawTasks = tasksEnvelope?.data ?? [];

  // Sync board tasks when database tasks load
  useEffect(() => {
    if (rawTasks) {
      setBoardTasks(rawTasks as unknown as KanbanTask[]);
    }
  }, [rawTasks]);

  // Sync versions and set selected version when generation status transitions to COMPLETED
  useEffect(() => {
    if (generationStatus === "COMPLETED") {
      refetchVersions().then((res) => {
        const latestVersion = res.data?.data?.[0];
        if (latestVersion !== undefined) {
          setSelectedVersion(latestVersion);
        }
      });
      refetchTasks();
    }
  }, [generationStatus]);

  // Show status transition success toast
  useEffect(() => {
    if (prevStatus && prevStatus !== "COMPLETED" && generationStatus === "COMPLETED") {
      toast.success("AI Task Generation complete! Enjoy your Kanban board.");
    }
    setPrevStatus(generationStatus);
  }, [generationStatus, prevStatus]);

  // Mutations
  const generateMutation = trpc.task.generate.useMutation();
  const updateStatusMutation = trpc.task.updateStatus.useMutation();
  const updatePositionMutation = trpc.task.updatePosition.useMutation();
  const deleteMutation = trpc.task.delete.useMutation();

  const handleGenerateTasks = async () => {
    const toastId = toast.loading("Submitting spec to AI task generator...");
    try {
      await generateMutation.mutateAsync({ prdId });
      toast.success("AI breakdown initiated successfully.", { id: toastId });
      statusEnvelope.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to start AI breakdown", { id: toastId });
    }
  };

  // Drag & drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = boardTasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const draggedTask = boardTasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    // Check if task dropped on a column or another task
    let targetStatus: TaskStatus = draggedTask.status;
    if (COLUMNS.some((col) => col.id === overId)) {
      targetStatus = overId as TaskStatus;
    } else {
      const overTask = boardTasks.find((t) => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    // Save current state for rollback
    const previousTasks = [...boardTasks];

    // Filter out dragged task
    let updatedTasks = boardTasks.filter((t) => t.id !== taskId);

    // Insert at new location
    if (COLUMNS.some((col) => col.id === overId)) {
      // Dropped on empty column
      const updatedDraggedTask = { ...draggedTask, status: targetStatus };
      updatedTasks.push(updatedDraggedTask);
    } else {
      // Dropped on a task
      const insertIndex = updatedTasks.findIndex((t) => t.id === overId);
      const updatedDraggedTask = { ...draggedTask, status: targetStatus };
      if (insertIndex !== -1) {
        updatedTasks.splice(insertIndex, 0, updatedDraggedTask);
      } else {
        updatedTasks.push(updatedDraggedTask);
      }
    }

    // Recalculate positions for all tasks
    const finalTasks = updatedTasks.map((task) => {
      const colTasks = updatedTasks.filter((t) => t.status === task.status);
      const position = colTasks.findIndex((t) => t.id === task.id);
      return { ...task, position };
    });

    // Optimistic local state update
    setBoardTasks(finalTasks);

    try {
      const statusChanged = targetStatus !== draggedTask.status;
      const newDraggedTask = finalTasks.find((t) => t.id === taskId);
      const newPosition = newDraggedTask ? newDraggedTask.position : 0;
      const positionChanged = newPosition !== draggedTask.position;

      if (statusChanged) {
        await updateStatusMutation.mutateAsync({
          taskId,
          status: targetStatus,
        });
      }

      if (positionChanged || statusChanged) {
        await updatePositionMutation.mutateAsync({
          taskId,
          position: newPosition,
        });
      }

      refetchTasks();
    } catch (err: any) {
      setBoardTasks(previousTasks);
      toast.error("Failed to move task. Reverting...");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this task?");
    if (!confirmDelete) return;

    try {
      await deleteMutation.mutateAsync({ taskId });
      toast.success("Task deleted successfully.");
      refetchTasks();
    } catch (err: any) {
      toast.error("Failed to delete task.");
    }
  };

  // Group tasks by status
  const groupedTasks = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = boardTasks.filter((t) => t.status === col.id);
      return acc;
    },
    {} as Record<TaskStatus, KanbanTask[]>
  );

  const isQueueOrGen = generationStatus === "QUEUED" || generationStatus === "GENERATING";

  if (tasksLoading && !isQueueOrGen) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner />
      </div>
    );
  }

  // Full-page states if there are no task versions generated yet
  if (versions.length === 0) {
    if (isQueueOrGen) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 max-w-xl mx-auto border border-dashed border-border/40 rounded-xl bg-card/25 backdrop-blur-xl">
          <div className="p-4 rounded-full bg-primary/10 animate-bounce">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">
              {generationStatus === "QUEUED" ? "AI Task Generation Queued" : "AI Architecting Tasks"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {generationStatus === "QUEUED"
                ? "Your generation is queued and will start momentarily. Hang tight!"
                : "Our AI Lead Engineer is scanning the functional specs, user stories, and acceptance criteria to outline discrete, dependency-mapped engineering tasks."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary font-semibold bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full">
            <Spinner className="h-4 w-4" />
            <span className="capitalize">Status: {generationStatus.toLowerCase()}</span>
          </div>
        </div>
      );
    }

    if (generationStatus === "FAILED") {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 max-w-xl mx-auto border border-dashed border-destructive/20 rounded-xl bg-destructive/5 backdrop-blur-xl">
          <div className="p-4 rounded-full bg-destructive/10">
            <Workflow className="h-8 w-8 text-destructive animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-destructive">Task Generation Failed</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              We encountered an error while breaking down the specification. Please review the details below.
            </p>
            {generationError && (
              <div className="max-w-md mx-auto p-3 text-left bg-card border border-border/40 rounded-lg font-mono text-xs text-rose-400 overflow-x-auto max-h-32">
                {generationError}
              </div>
            )}
          </div>
          <Button onClick={handleGenerateTasks} className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            <RefreshCw className="h-4 w-4" /> Retry AI Breakdown
          </Button>
        </div>
      );
    }

    // Default to NOT_STARTED empty state
    return (
      <Empty className="max-w-xl mx-auto my-12 border-dashed bg-card/30 backdrop-blur-xl">
        <EmptyMedia variant="icon">
          <Brain className="h-6 w-6 text-primary animate-pulse" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No Engineering Tasks Generated Yet</EmptyTitle>
          <EmptyDescription>
            Let our AI lead engineer scan the functional specs, objective, and acceptance criteria of this PRD to generate structured, dependency-mapped engineering tasks.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={handleGenerateTasks} className="gap-2 bg-gradient-to-r from-primary to-primary/80">
            <Sparkles className="h-4 w-4" /> Break Down Spec Into Tasks
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {/* Background status banner if a background run is active or failed */}
      {isQueueOrGen && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl text-xs font-semibold text-primary animate-pulse">
          <div className="flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            <span>AI is currently generating a new task iteration in the background...</span>
          </div>
          <span className="text-[10px] uppercase font-bold bg-primary/20 px-2.5 py-0.5 rounded-full">
            Status: {generationStatus}
          </span>
        </div>
      )}

      {generationStatus === "FAILED" && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs font-semibold text-destructive">
          <div className="flex flex-col gap-1">
            <span className="font-bold">AI Regeneration Failed</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {generationError || "An unknown error occurred during task generation."}
            </span>
          </div>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleGenerateTasks}
            className="h-8 gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <RefreshCw className="h-3 w-3" /> Retry AI Breakdown
          </Button>
        </div>
      )}

      {/* Kanban controls & versions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-border/40 bg-card/20 backdrop-blur-xl p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            Tasks Iteration:
          </span>
          {versions.length > 0 && (
            <div className="relative inline-block text-left">
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(Number(e.target.value))}
                className="bg-card border border-border/40 text-foreground text-xs rounded-lg px-3 py-1.5 font-semibold focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-8 cursor-pointer"
              >
                {versions.map((ver) => (
                  <option key={ver} value={ver}>
                    v{ver} (Generated Tasks)
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isQueueOrGen ? (
            <Button disabled className="gap-2 bg-gradient-to-r from-primary to-primary/80 animate-pulse">
              <Spinner className="h-4 w-4" /> AI Architecting Tasks...
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTasks}
              className="gap-2 border-primary/20 hover:border-primary/50 text-primary hover:bg-primary/5 bg-primary/5 animate-shimmer"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" /> Regenerate Tasks (v{(versions[0] || 0) + 1})
            </Button>
          )}
        </div>
      </div>

      {/* Dnd-kit board context */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              color={col.color}
              tasks={groupedTasks[col.id] || []}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="border border-primary/40 bg-card rounded-xl p-4 shadow-xl opacity-90 scale-105 pointer-events-none space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold leading-tight text-foreground text-primary">
                  {activeTask.title}
                </h4>
              </div>
              {activeTask.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {activeTask.description}
                </p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

