import { z } from "zod";
import { workspaceProcedure, router, createResponse } from "../../trpc.js";
import { projectService } from "@repo/services";

export const projectRouter = router({
  create: workspaceProcedure
    .input(
      z.object({
        name: z.string().min(1, "Project name cannot be empty"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await projectService.createProject(
        ctx.auth.user.id,
        ctx.workspace.active.id,
        input.name,
        input.description,
        ctx.requestId
      );
      return createResponse(result, ctx);
    }),

  update: workspaceProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        name: z.string().min(1, "Project name cannot be empty"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await projectService.updateProject(
        ctx.auth.user.id,
        ctx.workspace.active.id,
        input.projectId,
        { name: input.name, description: input.description },
        ctx.requestId
      );
      return createResponse(result, ctx);
    }),

  archive: workspaceProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await projectService.archiveProject(
        ctx.auth.user.id,
        ctx.workspace.active.id,
        input.projectId,
        ctx.requestId
      );
      return createResponse(result, ctx);
    }),

  list: workspaceProcedure.query(async ({ ctx }) => {
    const result = await projectService.listProjects(ctx.workspace.active.id);
    return createResponse(result, ctx);
  }),

  byId: workspaceProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await projectService.getProject(
        ctx.workspace.active.id,
        input.projectId
      );
      return createResponse(result, ctx);
    }),
});
