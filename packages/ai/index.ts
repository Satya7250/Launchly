import { env } from "./env.js";
import { OpenAIProvider, MockProvider, PRDProvider } from "./providers/provider.js";

export { env } from "./env.js";
export { prdSchema } from "./schemas/prd.js";
export type { PRD } from "./schemas/prd.js";
export { aiTaskSchema, aiTasksResponseSchema } from "./schemas/task-generation.js";
export type { AITask, AITasksResponse } from "./schemas/task-generation.js";
export { aiReviewFindingSchema, aiReviewResponseSchema } from "./schemas/ai-review.js";
export type { AIReviewFinding, AIReviewResponse, AIReviewInput, AIReviewResult } from "./schemas/ai-review.js";
export * from "./providers/provider.js";

export function getPRDProvider(): PRDProvider {
  const apiKey = env.OPENAI_API_KEY;
  const useMock = process.env.MOCK_AI === 'true';
  if (
    useMock ||
    !apiKey ||
    apiKey === "openai_api_key" ||
    apiKey.trim() === "" ||
    apiKey.includes("your_") ||
    apiKey.includes("placeholder")
  ) {
    return new MockProvider();
  }
  // No silent fallback; any runtime errors from the provider will propagate as clear errors
  return new OpenAIProvider(apiKey);
}
