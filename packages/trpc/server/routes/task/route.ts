import { z } from "zod";
import { workspaceProcedure, router, createResponse } from "../../trpc.js";
import { taskService } from "@repo/services";
import { throwTrpcError } from "../../utils/errors.js";
import { TRPCError } from "@trpc/server";

const taskStatusEnum = z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);

export const taskRouter = router({
  generate: workspaceProcedure
    .input(
      z.object({
        prdId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await taskService.triggerTaskGeneration(
          ctx.workspace.active.id,
          input.prdId
        );
        return createResponse(result, ctx);
      } catch (err: any) {
        if (err.message === "PRD_NOT_FOUND") {
          throwTrpcError("WORKSPACE_NOT_FOUND", "PRD not found.");
        }
        if (err.message === "FEATURE_REQUEST_NOT_FOUND") {
          throwTrpcError("WORKSPACE_NOT_FOUND", "Feature request not found.");
        }
        if (err.message === "GENERATION_IN_PROGRESS") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "AI task generation is already in progress for this PRD.",
          });
        }
        throw err;
      }
    }),

  list: workspaceProcedure
    .input(
      z.object({
        prdId: z.string().uuid(),
        version: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await taskService.listTasks(
        ctx.workspace.active.id,
        input.prdId,
        input.version
      );
      return createResponse(result, ctx);
    }),

  listVersions: workspaceProcedure
    .input(
      z.object({
        prdId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await taskService.listTaskVersions(
        ctx.workspace.active.id,
        input.prdId
      );
      return createResponse(result, ctx);
    }),

  updateStatus: workspaceProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        status: taskStatusEnum,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await taskService.updateTaskStatus(
        ctx.workspace.active.id,
        input.taskId,
        input.status
      );
      if (!result) {
        throwTrpcError("WORKSPACE_NOT_FOUND", "Task not found.");
      }
      return createResponse(result, ctx);
    }),

  updatePosition: workspaceProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
        position: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await taskService.updateTaskPosition(
        ctx.workspace.active.id,
        input.taskId,
        input.position
      );
      if (!result) {
        throwTrpcError("WORKSPACE_NOT_FOUND", "Task not found.");
      }
      return createResponse(result, ctx);
    }),

  delete: workspaceProcedure
    .input(
      z.object({
        taskId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await taskService.deleteTask(
        ctx.workspace.active.id,
        input.taskId
      );
      if (!result) {
        throwTrpcError("WORKSPACE_NOT_FOUND", "Task not found.");
      }
      return createResponse(result, ctx);
    }),

  getGenerationStatus: workspaceProcedure
    .input(
      z.object({
        prdId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await taskService.getGenerationStatus(
        ctx.workspace.active.id,
        input.prdId
      );
      return createResponse(result, ctx);
    }),

  getGenerationHistory: workspaceProcedure
    .input(
      z.object({
        prdId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await taskService.getGenerationHistory(
        ctx.workspace.active.id,
        input.prdId
      );
      return createResponse(result, ctx);
    }),
});
