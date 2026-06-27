import { z } from "zod";
import { workspaceProcedure, router, createResponse } from "../../trpc.js";
import { featureRequestService, clarificationService } from "@repo/services";
import { throwTrpcError } from "../../utils/errors.js";

const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const sourceEnum = z.enum(["MANUAL", "EMAIL", "API", "SUPPORT"]);

export const featureRequestRouter = router({
  create: workspaceProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        title: z.string().min(1, "Title cannot be empty"),
        description: z.string().min(1, "Description cannot be empty"),
        priority: priorityEnum.default("MEDIUM"),
        source: sourceEnum.default("MANUAL"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await featureRequestService.createFeatureRequest(
          ctx.auth.user.id,
          ctx.workspace.active.id,
          input.projectId,
          input.title,
          input.description,
          input.priority,
          input.source
        );
        return createResponse(result, ctx);
      } catch (err: any) {
        if (err.message === "PROJECT_NOT_FOUND") {
          throwTrpcError("WORKSPACE_ACCESS_DENIED", "The selected project is archived or belongs to another workspace.");
        }
        throw err;
      }
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        priority: priorityEnum.optional(),
        source: sourceEnum.optional(),
        status: z.enum(["NEW", "CLARIFICATION_REQUIRED", "READY_FOR_PRD", "PRD_GENERATED"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, status, ...fields } = input;

      // Handle status update via service to validate transitions
      if (status) {
        try {
          await featureRequestService.changeStatus(
            ctx.auth.user.id,
            ctx.workspace.active.id,
            id,
            status
          );
        } catch (err: any) {
          if (err.message === "INVALID_STATUS_TRANSITION") {
            throwTrpcError("VALIDATION_ERROR", "Invalid status transition.");
          }
          throw err;
        }
      }

      let result;
      if (Object.keys(fields).length > 0) {
        result = await featureRequestService.updateFeatureRequest(
          ctx.auth.user.id,
          ctx.workspace.active.id,
          id,
          fields
        );
      } else {
        const fetched = await featureRequestService.getFeatureRequest(
          ctx.workspace.active.id,
          id
        );
        if (!fetched) {
          throwTrpcError("WORKSPACE_NOT_FOUND", "Feature request not found.");
        }
        result = fetched;
      }

      return createResponse(result, ctx);
    }),

  archive: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await featureRequestService.archiveFeatureRequest(
        ctx.auth.user.id,
        ctx.workspace.active.id,
        input.id
      );
      return createResponse(result, ctx);
    }),

  list: workspaceProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const result = await featureRequestService.listFeatureRequests(
        ctx.workspace.active.id,
        input?.projectId
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
      const result = await featureRequestService.getFeatureRequest(
        ctx.workspace.active.id,
        input.id
      );
      if (!result) {
        throwTrpcError("WORKSPACE_NOT_FOUND", "Feature request not found.");
      }
      return createResponse(result, ctx);
    }),

  requestClarification: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Fetch feature request details
      const request = await featureRequestService.getFeatureRequest(
        ctx.workspace.active.id,
        input.id
      );

      if (!request) {
        throwTrpcError("WORKSPACE_NOT_FOUND", "Feature request not found.");
      }

      // 2. Analyze the requirements text
      const analysis = await clarificationService.analyzeRequirements(request.description);

      // 3. Mark in DB as CLARIFICATION_REQUIRED
      await featureRequestService.changeStatus(
        ctx.auth.user.id,
        ctx.workspace.active.id,
        input.id,
        "CLARIFICATION_REQUIRED"
      );

      return createResponse(
        {
          isReady: analysis.isReady,
          questions: analysis.questions,
        },
        ctx
      );
    }),
});
