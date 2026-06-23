import { z } from "zod";
import { workspaceProcedure, router, createResponse } from "../../trpc.js";
import { approvalService, ApprovalServiceError } from "@repo/services";
import { TRPCError } from "@trpc/server";

export const approvalRouter = router({
  status: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const result = await approvalService.getApprovalStatus(
          ctx.workspace.active.id,
          input.pullRequestId
        );
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof ApprovalServiceError) {
          if (err.code === "PULL_REQUEST_NOT_FOUND") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: err.message,
            });
          }
        }
        throw err;
      }
    }),

  history: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const result = await approvalService.getApprovalHistory(
          ctx.workspace.active.id,
          input.pullRequestId
        );
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof ApprovalServiceError) {
          if (err.code === "PULL_REQUEST_NOT_FOUND") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: err.message,
            });
          }
        }
        throw err;
      }
    }),

  request: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await approvalService.requestApproval(
          ctx.auth.user.id,
          ctx.workspace.active.id,
          input.pullRequestId,
          input.comments
        );
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof ApprovalServiceError) {
          switch (err.code) {
            case "PULL_REQUEST_NOT_FOUND":
              throw new TRPCError({
                code: "NOT_FOUND",
                message: err.message,
              });
            case "PROJECT_NOT_FOUND":
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: err.message,
              });
            case "INVALID_TRANSITION":
              throw new TRPCError({
                code: "CONFLICT",
                message: err.message,
              });
            default:
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: err.message,
              });
          }
        }
        throw err;
      }
    }),

  approve: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await approvalService.approveRelease(
          ctx.auth.user.id,
          ctx.workspace.active.id,
          input.pullRequestId,
          input.comments
        );
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof ApprovalServiceError) {
          switch (err.code) {
            case "PULL_REQUEST_NOT_FOUND":
              throw new TRPCError({
                code: "NOT_FOUND",
                message: err.message,
              });
            case "PROJECT_NOT_FOUND":
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: err.message,
              });
            case "INVALID_TRANSITION":
              throw new TRPCError({
                code: "CONFLICT",
                message: err.message,
              });
            case "AI_REVIEW_NOT_COMPLETED":
            case "BLOCKING_FINDINGS_EXIST":
              throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message: err.message,
              });
            default:
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: err.message,
              });
          }
        }
        throw err;
      }
    }),

  reject: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
        comments: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await approvalService.rejectRelease(
          ctx.auth.user.id,
          ctx.workspace.active.id,
          input.pullRequestId,
          input.comments
        );
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof ApprovalServiceError) {
          switch (err.code) {
            case "PULL_REQUEST_NOT_FOUND":
              throw new TRPCError({
                code: "NOT_FOUND",
                message: err.message,
              });
            case "PROJECT_NOT_FOUND":
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: err.message,
              });
            case "INVALID_TRANSITION":
              throw new TRPCError({
                code: "CONFLICT",
                message: err.message,
              });
            default:
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: err.message,
              });
          }
        }
        throw err;
      }
    }),
});
