import { z } from "zod";
import { workspaceProcedure, router, createResponse } from "../../trpc.js";
import { aiReviewService, AIReviewError } from "@repo/services";
import { TRPCError } from "@trpc/server";

export const reviewRouter = router({
  generate: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await aiReviewService.generateReview(
          ctx.workspace.active.id,
          input.pullRequestId
        );
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof AIReviewError) {
          switch (err.code) {
            case "REVIEW_PENDING_CONFLICT":
              throw new TRPCError({
                code: "CONFLICT",
                message: err.message,
              });
            case "PULL_REQUEST_NOT_FOUND":
              throw new TRPCError({
                code: "NOT_FOUND",
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

  regenerate: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await aiReviewService.regenerateReview(
          ctx.workspace.active.id,
          input.pullRequestId
        );
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof AIReviewError) {
          switch (err.code) {
            case "REVIEW_PENDING_CONFLICT":
              throw new TRPCError({
                code: "CONFLICT",
                message: err.message,
              });
            case "PULL_REQUEST_NOT_FOUND":
              throw new TRPCError({
                code: "NOT_FOUND",
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

  list: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await aiReviewService.listReviews(
        ctx.workspace.active.id,
        input.pullRequestId,
        input.page,
        input.limit
      );
      return createResponse(result, ctx);
    }),

  byId: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await aiReviewService.getReview(
        ctx.workspace.active.id,
        input.id
      );
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Review not found",
        });
      }
      return createResponse(result, ctx);
    }),

  latest: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await aiReviewService.getLatestReview(
        ctx.workspace.active.id,
        input.pullRequestId
      );
      return createResponse(result, ctx);
    }),

  findings: workspaceProcedure
    .input(
      z.object({
        reviewId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await aiReviewService.listFindings(
        ctx.workspace.active.id,
        input.reviewId
      );
      return createResponse(result, ctx);
    }),
});
