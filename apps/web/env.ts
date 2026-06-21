import { z } from "zod";
import { createEnv } from "@repo/shared/env";

export const env = createEnv(
  z.object({
    NEXT_PUBLIC_API_URL: z.string().optional(),
  }),
  {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  }
);

