import { z } from "zod";

/**
 * Preprocesses environment variables, treating empty strings as undefined.
 */
function cleanEnvVars(envVars: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const key in envVars) {
    if (Object.prototype.hasOwnProperty.call(envVars, key)) {
      const val = envVars[key];
      cleaned[key] = val === "" ? undefined : val;
    }
  }
  return cleaned;
}

/**
 * Creates and validates environment variables.
 * Fails fast by logging errors and throwing if validation fails.
 */
export function createEnv<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  envVars: Record<string, unknown> = process.env
): z.infer<z.ZodObject<T>> {
  const cleaned = cleanEnvVars(envVars);
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const formattedErrors = result.error.format();
    console.error("❌ Environment validation failed:");
    console.error(JSON.stringify(formattedErrors, null, 2));

    const isBrowser = typeof window !== "undefined";
    if (isBrowser) {
      throw new Error("Environment validation failed on the client.");
    } else {
      throw new Error(
        `Environment validation failed for variables: ${Object.keys(formattedErrors)
          .filter((k) => k !== "_errors")
          .join(", ")}`
      );
    }
  }
  return result.data;
}
