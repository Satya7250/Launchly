import { PRD, prdSchema } from "../schemas/prd.js";
import { AITasksResponse, aiTasksResponseSchema } from "../schemas/task-generation.js";
import { AIReviewInput, AIReviewResult, aiReviewResponseSchema } from "../schemas/ai-review.js";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

export interface PRDProvider {
  generatePRD(title: string, description: string): Promise<PRD>;
  generateTasks(prd: PRD): Promise<AITasksResponse>;
  reviewPullRequest(input: AIReviewInput): Promise<AIReviewResult>;
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

  async generateTasks(prd: PRD): Promise<AITasksResponse> {
    const isOpenRouter = this.client.baseURL.includes("openrouter.ai");
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are an expert Lead Engineer and Technical Architect.
Your task is to break down a Product Requirements Document (PRD) into discrete, actionable engineering tasks.
For each task, provide:
1. A concise, clear title.
2. A detailed engineering description including steps.
3. An estimate of the effort (e.g., "4 hours", "2 days").
4. Implementation complexity: LOW, MEDIUM, or HIGH.
5. Task dependencies (list of other task titles generated in this batch).
6. Priority: LOW, MEDIUM, HIGH, or CRITICAL.
7. Your confidence score from 0 to 100.

Return the list of tasks exactly matching the required JSON format.`,
        },
        {
          role: "user",
          content: `PRD Document JSON:\n${JSON.stringify(prd, null, 2)}`,
        },
      ],
      response_format: zodResponseFormat(aiTasksResponseSchema, "tasks_response"),
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("Failed to get response content from OpenAI for tasks generation");
    }

    const parsed = aiTasksResponseSchema.parse(JSON.parse(content));
    return {
      tasks: parsed.tasks,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  async reviewPullRequest(input: AIReviewInput): Promise<AIReviewResult> {
    const isOpenRouter = this.client.baseURL.includes("openrouter.ai");
    const model = isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini";
    const promptVersion = "v1";

    const systemPrompt = `You are an expert Staff Engineer performing a thorough pull request review.
You will be given a pull request diff, the linked PRD requirements, and the planned engineering tasks.
Provide a structured, objective review with concrete findings. Be precise and actionable.
Score each dimension from 0 to 100 and give a clear recommendation.`;

    const userPrompt = `## Pull Request
Title: ${input.pullRequest.title}
Author: ${input.pullRequest.author}
Branch: ${input.pullRequest.branch ?? "unknown"} → ${input.pullRequest.baseBranch ?? "main"}

## Changed Files (${input.files.length} total)
${input.files
  .slice(0, 30)
  .map(
    (f) =>
      `### ${f.filename} [${f.status}] +${f.additions}/-${f.deletions}\n${f.patch ? f.patch.slice(0, 3000) : "(patch unavailable)"}`
  )
  .join("\n\n")}

## Linked PRD
${input.prd
  ? `Problem: ${input.prd.problemStatement ?? "-"}\nGoals: ${(input.prd.goals ?? []).join("; ")}`
  : "No PRD linked."}

## Engineering Tasks (${input.tasks.length} total)
${input.tasks
  .slice(0, 20)
  .map((t) => `- [${t.status}] ${t.title}`)
  .join("\n")}`;

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("Failed to get AI review response from OpenAI");
    }

    const parsed = aiReviewResponseSchema.parse(JSON.parse(content));

    return {
      review: parsed,
      provider: isOpenRouter ? "openrouter" : "openai",
      model,
      promptVersion,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
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

  async generateTasks(prd: PRD): Promise<AITasksResponse> {
    return {
      usage: {
        promptTokens: 150,
        completionTokens: 250,
        totalTokens: 400,
      },
      tasks: [
        {
          title: "Setup Database Schemas and Migrations",
          description: `Define and migrate database tables required for implementing: ${prd.title}. Ensure tenant isolation and appropriate indices.`,
          estimate: "4 hours",
          complexity: "LOW",
          dependencies: [],
          priority: "HIGH",
          confidence: 95,
        },
        {
          title: "Implement API Endpoints and Service Logic",
          description: `Create service functions and API endpoints to handle functional requirements: ${prd.functionalRequirements.map(f => f.id).join(", ")}.`,
          estimate: "1 day",
          complexity: "MEDIUM",
          dependencies: ["Setup Database Schemas and Migrations"],
          priority: "HIGH",
          confidence: 90,
        },
        {
          title: "Build Frontend UI Components",
          description: `Implement responsive user interface for ${prd.title} with Shadcn UI and Tailwind. Connect with frontend state/mutations.`,
          estimate: "2 days",
          complexity: "MEDIUM",
          dependencies: ["Implement API Endpoints and Service Logic"],
          priority: "HIGH",
          confidence: 85,
        },
        {
          title: "Add Validation and Error States",
          description: `Ensure proper error boundaries, loading skeletons, and validation for user inputs. Address edge case: ${prd.edgeCases?.[0] || 'Invalid inputs'}.`,
          estimate: "3 hours",
          complexity: "LOW",
          dependencies: ["Build Frontend UI Components"],
          priority: "MEDIUM",
          confidence: 95,
        }
      ]
    };
  }

  async reviewPullRequest(input: AIReviewInput): Promise<AIReviewResult> {
    const filesReviewed = input.files.slice(0, 5);
    return {
      provider: "mock",
      model: "mock",
      promptVersion: "v1",
      usage: { promptTokens: 500, completionTokens: 300, totalTokens: 800 },
      review: {
        overallScore: 78,
        prdScore: input.prd ? 82 : 50,
        taskCoverageScore: input.tasks.length > 0 ? 75 : 40,
        securityScore: 85,
        performanceScore: 80,
        architectureScore: 72,
        summary:
          `Mock review for PR #${input.pullRequest.number}: "${input.pullRequest.title}". ` +
          `${filesReviewed.length} file(s) analysed. Overall the changes look solid with minor issues.`,
        recommendation: "APPROVE",
        findings: [
          {
            severity: "MEDIUM",
            category: "STYLE",
            title: "Missing inline documentation",
            description: "Several exported functions lack JSDoc comments.",
            suggestion: "Add JSDoc comments to all public API functions.",
            filePath: filesReviewed[0]?.filename,
          },
          {
            severity: "LOW",
            category: "TEST_COVERAGE",
            title: "No unit tests added",
            description: "The new service functions are not covered by unit tests.",
            suggestion: "Add unit tests using Vitest or Jest for the new service methods.",
          },
        ],
      },
    };
  }
}
