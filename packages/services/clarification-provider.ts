export interface ClarificationProvider {
  analyze(description: string): Promise<{ isReady: boolean; questions: string[] }>;
}

export class RuleBasedClarificationProvider implements ClarificationProvider {
  public async analyze(description: string): Promise<{ isReady: boolean; questions: string[] }> {
    const questions: string[] = [];
    const text = description.toLowerCase().trim();

    // 1. Initial length check
    if (text.length < 80) {
      questions.push("The description is very brief. Please elaborate on what you want to achieve with this feature.");
      return { isReady: false, questions };
    }

    // 2. Persona / Target user check
    const hasPersona = /\b(user|customer|admin|member|actor|who|role|persona|client|buyer|visitor)\b/i.test(text);
    if (!hasPersona) {
      questions.push("Who is the target user or persona for this feature?");
    }

    // 3. Problem / Value check
    const hasProblem = /\b(problem|solve|why|goal|pain|need|purpose|value|benefit|objective)\b/i.test(text);
    if (!hasProblem) {
      questions.push("What specific user problem or business value does this feature address?");
    }

    // 4. Expected Behavior / Flow check
    const hasFlow = /\b(flow|behavior|expect|should|happen|scenario|step|click|navigate|screen|trigger)\b/i.test(text);
    if (!hasFlow) {
      questions.push("What is the expected user flow or behavior for this feature?");
    }

    // 5. Success Criteria check
    const hasSuccess = /\b(success|metric|measure|criteria|test|done|validation|result|outcome)\b/i.test(text);
    if (!hasSuccess) {
      questions.push("What are the success criteria or definition of done for this feature?");
    }

    // 6. Edge cases / constraints check
    const hasEdgeCases = /\b(edge|limit|boundary|error|fail|restrict|constraint|alternative|exception)\b/i.test(text);
    if (!hasEdgeCases && text.length < 250) {
      // Suggest edge case considerations if the overall description is moderately short
      questions.push("Are there any edge cases, constraints, or error states we need to handle?");
    }

    const isReady = questions.length === 0;
    return { isReady, questions };
  }
}

export const ruleBasedClarificationProvider = new RuleBasedClarificationProvider();
