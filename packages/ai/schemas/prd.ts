import { z } from "zod";

export const prdSchema = z.object({
  title: z.string().describe("The descriptive title of the PRD"),
  executiveSummary: z.string().describe("A high-level executive summary of the feature request"),
  targetUsers: z.array(z.string()).describe("The primary and secondary target user personas"),
  functionalRequirements: z.array(
    z.object({
      id: z.string().describe("Unique requirement ID, e.g. FR-001"),
      title: z.string().describe("Short title of the requirement"),
      description: z.string().describe("Detailed description of the requirement"),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]).describe("Priority of the requirement"),
    })
  ).describe("Functional requirements mapped to implement the feature"),
  nonFunctionalRequirements: z.array(
    z.object({
      category: z.string().describe("Category, e.g., Security, Performance, Scalability"),
      description: z.string().describe("Constraint or requirement description"),
    })
  ).describe("Non-functional constraints and requirements"),
  risks: z.array(
    z.object({
      description: z.string().describe("Potential risk / pitfall in implementation or UX"),
      mitigation: z.string().describe("Strategy to mitigate the defined risk"),
    })
  ).describe("Identified risks and proposed mitigations"),
  assumptions: z.array(z.string()).describe("Underlying assumptions made during requirements definition"),
  problemStatement: z.string().describe("Detailed definition of the problem being solved"),
  goals: z.array(z.string()).describe("The key objectives and goals of the feature"),
  nonGoals: z.array(z.string()).describe("Explicit non-goals or boundaries of the scope"),
  userStories: z.array(
    z.object({
      story: z.string().describe("User story in 'As a... I want... So that...' format"),
      value: z.string().describe("Business or user value statement for this story"),
    })
  ).describe("User stories representing the feature scope"),
  acceptanceCriteria: z.array(z.string()).describe("Detailed list of acceptance criteria"),
  edgeCases: z.array(z.string()).describe("Edge cases that should be handled gracefully"),
  successMetrics: z.array(z.string()).describe("Key performance indicators / success metrics to track"),
});

export type PRD = z.infer<typeof prdSchema>;
