import { z } from "zod";
import { createEnv } from "@repo/shared/env";

export const env = createEnv(
  z.object({
    INNGEST_EVENT_KEY: z.string(),
    INNGEST_SIGNING_KEY: z.string(),
  })
);
