import { TRPCError } from "@trpc/server";

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  WORKSPACE_NOT_FOUND: "NOT_FOUND",
  WORKSPACE_ACCESS_DENIED: "FORBIDDEN",
  MEMBERSHIP_REQUIRED: "FORBIDDEN",
  VALIDATION_ERROR: "BAD_REQUEST",
  RATE_LIMIT_EXCEEDED: "TOO_MANY_REQUESTS",
} as const;

export const ERROR_MESSAGES = {
  UNAUTHORIZED: "You must be logged in to access this resource.",
  FORBIDDEN: "You do not have permission to perform this action.",
  WORKSPACE_NOT_FOUND: "The requested workspace could not be found.",
  WORKSPACE_ACCESS_DENIED: "You do not have access to this workspace.",
  MEMBERSHIP_REQUIRED: "Active workspace membership is required.",
  VALIDATION_ERROR: "Input validation failed.",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please try again later.",
} as const;

export function throwTrpcError(codeKey: keyof typeof ERROR_CODES, customMessage?: string): never {
  throw new TRPCError({
    code: ERROR_CODES[codeKey],
    message: customMessage || ERROR_MESSAGES[codeKey],
  });
}
