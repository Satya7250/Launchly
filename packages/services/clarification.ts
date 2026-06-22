import { ClarificationProvider, ruleBasedClarificationProvider } from "./clarification-provider.js";

export class ClarificationService {
  private provider: ClarificationProvider;

  constructor(provider: ClarificationProvider = ruleBasedClarificationProvider) {
    this.provider = provider;
  }

  public async analyzeRequirements(description: string) {
    return this.provider.analyze(description);
  }

  public async generateQuestions(description: string) {
    const result = await this.provider.analyze(description);
    return result.questions;
  }

  public async determineReadiness(description: string) {
    const result = await this.provider.analyze(description);
    return result.isReady;
  }
}

export const clarificationService = new ClarificationService();
