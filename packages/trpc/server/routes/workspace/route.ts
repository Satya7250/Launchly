import { z } from "zod";
import {
  authedProcedure,
  workspaceProcedure,
  rateLimitMiddleware,
  router,
  createResponse,
} from "../../trpc.js";
import { workspaceService } from "@repo/services";
import { throwTrpcError } from "../../utils/errors.js";

export const workspaceRouter = router({
  getCurrentWorkspace: workspaceProcedure
    .query(({ ctx }) => {
      return createResponse(
        {
          workspace: ctx.workspace.active,
          role: ctx.workspace.role,
          membership: ctx.workspace.membership,
        },
        ctx
      );
    }),

  getWorkspaces: authedProcedure
    .query(async ({ ctx }) => {
      const workspaces = await workspaceService.getWorkspaces(ctx.auth.user.id);
      return createResponse(workspaces, ctx);
    }),

  switchWorkspace: authedProcedure
    .use(rateLimitMiddleware(15, 60 * 1000))
    .input(
      z.object({
        workspaceId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await workspaceService.switchWorkspace(
          ctx.auth.user.id,
          input.workspaceId,
          ctx.requestId
        );

        if (ctx.res) {
          ctx.res.cookie("active_workspace_id", result.workspace.id, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
          });
        }

        return createResponse(result, ctx);
      } catch (err: any) {
        if (err.message === "WORKSPACE_ACCESS_DENIED") {
          throwTrpcError("WORKSPACE_ACCESS_DENIED");
        }
        throw err;
      }
    }),

  createWorkspace: authedProcedure
    .use(rateLimitMiddleware(10, 60 * 1000))
    .input(
      z.object({
        name: z.string().min(1, "Workspace name cannot be empty"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await workspaceService.createWorkspace(
          ctx.auth.user.id,
          input.name,
          ctx.requestId
        );

        if (ctx.res) {
          ctx.res.cookie("active_workspace_id", result.workspace.id, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
          });
        }

        return createResponse(result, ctx);
      } catch (err: any) {
        throw err;
      }
    }),
});
