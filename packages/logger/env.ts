import { z } from "zod";
import { createEnv } from "@repo/shared/env";

export const env = createEnv(
  z.object({
    NODE_ENV: z.enum(["development", "prod"]).default("development"),
    LOGGER_LEVEL: z.enum(["error", "debug", "info"]).optional(),
  })
);
