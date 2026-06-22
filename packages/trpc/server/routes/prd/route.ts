import { z } from "zod";
import { workspaceProcedure, router, createResponse } from "../../trpc.js";
import { prdService } from "@repo/services";
import { throwTrpcError } from "../../utils/errors.js";

export const prdRouter = router({
  generate: workspaceProcedure
    .input(
      z.object({
        featureRequestId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await prdService.generatePRD(
          ctx.auth.user.id,
          ctx.workspace.active.id,
          input.featureRequestId,
          ctx.requestId
        );
        return createResponse(result, ctx);
      } catch (err: any) {
        if (err.message === "FEATURE_REQUEST_NOT_FOUND") {
          throwTrpcError("WORKSPACE_NOT_FOUND", "Feature request not found.");
        }
        if (err.message === "INVALID_FEATURE_REQUEST_STATUS") {
          throwTrpcError("VALIDATION_ERROR", "Feature request status must be READY_FOR_PRD or PRD_GENERATED.");
        }
        throw err;
      }
    }),

  regenerate: workspaceProcedure
    .input(
      z.object({
        featureRequestId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await prdService.generatePRD(
          ctx.auth.user.id,
          ctx.workspace.active.id,
          input.featureRequestId,
          ctx.requestId
        );
        return createResponse(result, ctx);
      } catch (err: any) {
        if (err.message === "FEATURE_REQUEST_NOT_FOUND") {
          throwTrpcError("WORKSPACE_NOT_FOUND", "Feature request not found.");
        }
        if (err.message === "INVALID_FEATURE_REQUEST_STATUS") {
          throwTrpcError("VALIDATION_ERROR", "Feature request status must be READY_FOR_PRD or PRD_GENERATED.");
        }
        throw err;
      }
    }),

  list: workspaceProcedure.query(async ({ ctx }) => {
    const result = await prdService.listPRDs(ctx.workspace.active.id);
    return createResponse(result, ctx);
  }),

  byId: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await prdService.getPRD(ctx.workspace.active.id, input.id);
      if (!result) {
        throwTrpcError("WORKSPACE_NOT_FOUND", "PRD not found.");
      }
      return createResponse(result, ctx);
    }),

  byFeatureRequestId: workspaceProcedure
    .input(
      z.object({
        featureRequestId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await prdService.getLatestPRDForFeatureRequest(
        ctx.workspace.active.id,
        input.featureRequestId
      );
      return createResponse(result, ctx);
    }),

  versions: workspaceProcedure
    .input(
      z.object({
        featureRequestId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      const result = await prdService.getPRDVersions(
        ctx.workspace.active.id,
        input.featureRequestId
      );
      return createResponse(result, ctx);
    }),
});
