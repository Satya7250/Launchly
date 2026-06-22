import { initTRPC } from "@trpc/server";
import { OpenApiMeta } from "trpc-to-openapi";
import { createContext } from "./context.js";
import { throwTrpcError } from "./utils/errors.js";
import { rateLimiter } from "@repo/services";

export const tRPCContext = initTRPC
  .meta<OpenApiMeta>()
  .context<typeof createContext>()
  .create({});

export const router = tRPCContext.router;

export const publicProcedure = tRPCContext.procedure;

export function createResponse<T>(data: T, ctx: { requestId: string }) {
  return {
    success: true as const,
    data,
    meta: {
      requestId: ctx.requestId,
      timestamp: Date.now(),
    },
  };
}

// Composable rate limit middleware
export const rateLimitMiddleware = (limit: number, windowMs: number) => {
  return tRPCContext.middleware(async ({ ctx, next }) => {
    const ip = ctx.req?.ip || (ctx.req?.headers["x-forwarded-for"] as string) || "anonymous";
    const key = `rate-limit:${ip}`;

    const isReached = await rateLimiter.isLimitReached(key, limit, windowMs);
    if (isReached) {
      throwTrpcError("RATE_LIMIT_EXCEEDED");
    }

    return next();
  });
};

// Composable auth check middleware
export const requireAuth = tRPCContext.middleware(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throwTrpcError("UNAUTHORIZED");
  }
  return next({
    ctx: {
      ...ctx,
      auth: ctx.auth,
    },
  });
});

export const authedProcedure = publicProcedure.use(requireAuth);

// Composable workspace check middleware
export const requireWorkspace = tRPCContext.middleware(async ({ ctx, next }) => {
  if (!ctx.auth) {
    throwTrpcError("UNAUTHORIZED");
  }
  if (!ctx.workspace) {
    throwTrpcError("MEMBERSHIP_REQUIRED");
  }
  return next({
    ctx: {
      ...ctx,
      auth: ctx.auth,
      workspace: ctx.workspace,
    },
  });
});

export const workspaceProcedure = publicProcedure.use(requireWorkspace);

// Composable role check middleware
export const requireRole = (allowedRoles: ("OWNER" | "ADMIN" | "MEMBER")[]) => {
  return tRPCContext.middleware(async ({ ctx, next }) => {
    if (!ctx.auth) {
      throwTrpcError("UNAUTHORIZED");
    }
    if (!ctx.workspace) {
      throwTrpcError("MEMBERSHIP_REQUIRED");
    }
    if (!allowedRoles.includes(ctx.workspace.role)) {
      throwTrpcError("FORBIDDEN");
    }
    return next({
      ctx: {
        ...ctx,
        auth: ctx.auth,
        workspace: ctx.workspace,
      },
    });
  });
};
