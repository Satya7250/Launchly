import { z } from "zod";
import { createEnv } from "@repo/shared/env";

export const env = createEnv(
  z.object({
    PORT: z.string().optional(),
    NODE_ENV: z.enum(["development", "prod"]).default("development"),
    BASE_URL: z.string().default("http://localhost:8000"),
  })
);
