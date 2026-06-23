import { z } from "zod";

// ─── Finding (individual issue) ──────────────────────────────────────────────

export const aiReviewFindingSchema = z.object({
  severity: z
    .enum(["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"])
    .describe("How urgent / blocking this finding is"),
  category: z
    .enum([
      "SECURITY",
      "PERFORMANCE",
      "ARCHITECTURE",
      "CORRECTNESS",
      "STYLE",
      "DOCUMENTATION",
      "TEST_COVERAGE",
      "OTHER",
    ])
    .describe("Domain this finding belongs to"),
  title: z
    .string()
    .describe("Short, one-line summary of the finding (< 120 chars)"),
  description: z
    .string()
    .describe("Full explanation of what the issue is and why it matters"),
  suggestion: z
    .string()
    .optional()
    .describe("Concrete recommended fix or improvement"),
  filePath: z
    .string()
    .optional()
    .describe("Relative path of the file this finding applies to"),
  lineStart: z.number().int().optional().describe("First relevant line number"),
  lineEnd: z.number().int().optional().describe("Last relevant line number"),
});

// ─── Top-level review response ────────────────────────────────────────────────

export const aiReviewResponseSchema = z.object({
  overallScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall quality score for the PR, 0–100"),
  prdScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How well the PR implements the linked PRD requirements, 0–100"),
  taskCoverageScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Fraction of linked engineering tasks addressed by this PR, 0–100"),
  securityScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Security posture of the changes, 0–100"),
  performanceScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Performance impact assessment, 0–100"),
  architectureScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Architectural soundness of the changes, 0–100"),
  summary: z
    .string()
    .describe("Executive summary of the overall pull request review (2–5 sentences)"),
  recommendation: z
    .enum(["APPROVE", "REQUEST_CHANGES", "COMMENT"])
    .describe("Final reviewer recommendation"),
  findings: z
    .array(aiReviewFindingSchema)
    .describe("List of specific findings from the review"),
});

export type AIReviewFinding = z.infer<typeof aiReviewFindingSchema>;
export type AIReviewResponse = z.infer<typeof aiReviewResponseSchema>;

// ─── Input context passed to the provider ────────────────────────────────────

export interface AIReviewInput {
  pullRequest: {
    id: string;
    number: number;
    title: string;
    branch: string | null;
    baseBranch: string | null;
    author: string;
  };
  files: {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch: string | null;
  }[];
  prd: {
    title: string | null;
    problemStatement: string | null;
    goals: string[] | null;
    acceptanceCriteria: string[] | null;
  } | null;
  tasks: {
    title: string;
    description: string | null;
    status: string;
  }[];
}

export interface AIReviewResult {
  review: AIReviewResponse;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: string;
  model: string;
  promptVersion: string;
}
