import { z } from "zod";
import { createEnv } from "@repo/shared/env";

export const env = createEnv(
  z.object({
    OPENAI_API_KEY: z.string(),
  })
);
