import { PRD, prdSchema } from "../schemas/prd.js";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

export interface PRDProvider {
  generatePRD(title: string, description: string): Promise<PRD>;
}

export class OpenAIProvider implements PRDProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    const isOpenRouter = apiKey.startsWith("sk-or-v1");
    this.client = new OpenAI({
      apiKey,
      baseURL: isOpenRouter ? "https://openrouter.ai/api/v1" : undefined,
    });
  }

  async generatePRD(title: string, description: string): Promise<PRD> {
    const isOpenRouter = this.client.baseURL.includes("openrouter.ai");
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are an expert Principal Product Manager. Your task is to generate a comprehensive, structured Product Requirements Document (PRD) from a feature request.
Ensure the output matches the required JSON structure exactly. Be extremely detailed in all requirements, goals, user stories, acceptance criteria, and edge cases.`,
        },
        {
          role: "user",
          content: `Feature Request Title: ${title}\nDescription: ${description}`,
        },
      ],
      response_format: zodResponseFormat(prdSchema, "prd"),
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("Failed to get response content from OpenAI");
    }

    return prdSchema.parse(JSON.parse(content));
  }
}

export class MockProvider implements PRDProvider {
  async generatePRD(title: string, description: string): Promise<PRD> {
    // Generate high-quality mock data dynamically using the feature request title and description
    return {
      title: `PRD: ${title}`,
      executiveSummary: `This document outlines the requirements for implementing "${title}". The objective is to address: ${description.slice(0, 150)}...`,
      targetUsers: [
        "End User / Customer looking for a seamless experience",
        "System Administrator monitoring system health and usage",
      ],
      functionalRequirements: [
        {
          id: "FR-1",
          title: `Core Integration of ${title}`,
          description: `Implement the primary interface and underlying logic for: ${title}.`,
          priority: "HIGH",
        },
        {
          id: "FR-2",
          title: "Audit and Activity Logs",
          description: "Ensure all user activities related to this feature are fully captured in the audit logs.",
          priority: "MEDIUM",
        },
        {
          id: "FR-3",
          title: "Error Handling & Feedback UI",
          description: "Display informative errors to users if actions fail, with retry capabilities.",
          priority: "HIGH",
        },
      ],
      nonFunctionalRequirements: [
        {
          category: "Performance",
          description: "Response time for loading the new interfaces should be under 200ms.",
        },
        {
          category: "Security",
          description: "All access must be scoped to the active organization/workspace context.",
        },
      ],
      risks: [
        {
          description: "Potential slow adoption if user interface is overly complex.",
          mitigation: "Keep the UI simple and clean, matching existing patterns in the app.",
        },
      ],
      assumptions: [
        "Users are logged into an active workspace when using the feature.",
        "Necessary backend database tables and columns have been migrated.",
      ],
      problemStatement: `Currently, users lack a structured way to handle ${title}. The description provided indicates: "${description}".`,
      goals: [
        `Provide a seamless user experience for ${title}.`,
        "Maintain absolute tenant isolation in a multi-tenant workspace environment.",
      ],
      nonGoals: [
        "Modifying existing core workspace models unrelated to feature requests.",
      ],
      userStories: [
        {
          story: `As an organization member, I want to use ${title} so that I can manage my work more effectively.`,
          value: "Saves time and improves workflow coordination within teams.",
        },
      ],
      acceptanceCriteria: [
        `Verify that the UI matches the design guidelines of the app.`,
        "Ensure the generated outputs are persisted correctly in the database.",
      ],
      edgeCases: [
        "Handling extremely long feature request descriptions without page distortion.",
        "Re-generating when a feature request is no longer in a valid state.",
      ],
      successMetrics: [
        "95% completion rate of generated documents within the first week.",
        "Reduction in manual coordination overhead for product managers.",
      ],
    };
  }
}
