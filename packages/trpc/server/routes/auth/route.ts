import { z } from "zod";
import {
  publicProcedure,
  authedProcedure,
  rateLimitMiddleware,
  router,
  createResponse,
} from "../../trpc.js";
import { authService, auditService } from "@repo/services";
import { throwTrpcError } from "../../utils/errors.js";

export const authRouter = router({
  getSession: publicProcedure
    .query(({ ctx }) => {
      return createResponse(
        {
          session: ctx.auth?.session ?? null,
          user: ctx.auth?.user ?? null,
          workspace: ctx.workspace
            ? {
                active: ctx.workspace.active,
                membership: ctx.workspace.membership,
                role: ctx.workspace.role,
              }
            : null,
        },
        ctx
      );
    }),

  signUp: publicProcedure
    .use(rateLimitMiddleware(15, 60 * 1000))
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const response = await authService.signUp(input);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throwTrpcError("VALIDATION_ERROR", errorData.message || "Sign up failed");
      }

      if (ctx.res) {
        const cookies = response.headers.getSetCookie();
        for (const cookie of cookies) {
          ctx.res.append("Set-Cookie", cookie);
        }
      }

      const data = await response.json();
      return createResponse(
        {
          session: data.session,
          user: data.user,
        },
        ctx
      );
    }),

  signIn: publicProcedure
    .use(rateLimitMiddleware(15, 60 * 1000))
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const response = await authService.signIn(input);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throwTrpcError("UNAUTHORIZED", errorData.message || "Invalid credentials");
      }

      if (ctx.res) {
        const cookies = response.headers.getSetCookie();
        for (const cookie of cookies) {
          ctx.res.append("Set-Cookie", cookie);
        }
      }

      const data = await response.json();
      
      auditService.logLogin(data.user.id, ctx.requestId);

      return createResponse(
        {
          session: data.session,
          user: data.user,
        },
        ctx
      );
    }),

  signOut: authedProcedure
    .mutation(async ({ ctx }) => {
      const headers = new Headers();
      if (ctx.req?.headers.cookie) {
        headers.set("cookie", ctx.req.headers.cookie);
      }
      
      const response = await authService.signOut(headers);

      if (ctx.res) {
        const cookies = response.headers.getSetCookie();
        for (const cookie of cookies) {
          ctx.res.append("Set-Cookie", cookie);
        }
        ctx.res.clearCookie("active_workspace_id", {
          path: "/",
        });
      }

      auditService.logLogout(ctx.auth.user.id, ctx.requestId);

      return createResponse({ success: true }, ctx);
    }),
});
