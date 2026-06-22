export interface TaskAiMetadata {
  estimate?: string;
  complexity?: "LOW" | "MEDIUM" | "HIGH";
  dependencies?: string[];
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence?: number;
}

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export interface EngineeringTask {
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
  metadata: TaskAiMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}
