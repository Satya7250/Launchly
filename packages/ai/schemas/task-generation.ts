import { z } from "zod";

export const aiTaskSchema = z.object({
  title: z.string().describe("A concise and descriptive title for the engineering task"),
  description: z.string().describe("A detailed description of what needs to be done, including steps and edge cases"),
  estimate: z.string().describe("AI-generated effort estimate (e.g. '4 hours', '2 days', '3 story points')"),
  complexity: z.enum(["LOW", "MEDIUM", "HIGH"]).describe("Task implementation complexity"),
  dependencies: z.array(z.string()).describe("Titles or IDs of other tasks or requirements this task depends on"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).describe("Task priority relative to other tasks"),
  confidence: z.number().describe("AI confidence score in the accuracy/scope of this task, from 0 to 100"),
});

export const aiTasksResponseSchema = z.object({
  tasks: z.array(aiTaskSchema).describe("List of generated engineering tasks"),
});

export type AITask = z.infer<typeof aiTaskSchema>;

export interface AITasksResponse {
  tasks: AITask[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
