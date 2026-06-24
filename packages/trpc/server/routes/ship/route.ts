import { z } from "zod";
import { workspaceProcedure, router, createResponse } from "../../trpc.js";
import { shipService, ShipServiceError } from "@repo/services";
import { TRPCError } from "@trpc/server";

/**
 * Converts a ShipServiceError code to the appropriate TRPCError.
 */
function mapShipError(err: ShipServiceError): never {
  switch (err.code) {
    case "PULL_REQUEST_NOT_FOUND":
    case "RELEASE_NOT_FOUND":
      throw new TRPCError({
        code: "NOT_FOUND",
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

export const shipRouter = router({
  /**
   * GET ship status for a pull request.
   * Returns current release status, shippedAt, shippedBy, releaseVersion.
   */
  status: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const result = await shipService.getShipStatus(
          ctx.workspace.active.id,
          input.pullRequestId
        );
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof ShipServiceError) {
          mapShipError(err);
        }
        throw err;
      }
    }),

  /**
   * GET immutable ship audit history for a pull request.
   * Returns all ship events in reverse chronological order.
   */
  history: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const result = await shipService.getShipHistory(
          ctx.workspace.active.id,
          input.pullRequestId
        );
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof ShipServiceError) {
          mapShipError(err);
        }
        throw err;
      }
    }),

  /**
   * POST — Ship an APPROVED release.
   *
   * Only callable when release.status === "APPROVED".
   * Transitions: APPROVED → SHIPPED
   * Rejects with 409 CONFLICT for any other starting status.
   *
   * Input:
   *   pullRequestId  — UUID of the pull request to ship
   *   releaseVersion — Optional human-readable version tag (e.g. "v1.2.3")
   *   notes          — Optional release notes
   */
  ship: workspaceProcedure
    .input(
      z.object({
        pullRequestId: z.string().uuid(),
        releaseVersion: z
          .string()
          .max(100)
          .optional()
          .transform((v) => v?.trim() || undefined),
        notes: z
          .string()
          .max(4000)
          .optional()
          .transform((v) => v?.trim() || undefined),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await shipService.shipRelease({
          userId: ctx.auth.user.id,
          organizationId: ctx.workspace.active.id,
          pullRequestId: input.pullRequestId,
          releaseVersion: input.releaseVersion,
          notes: input.notes,
        });
        return createResponse(result, ctx);
      } catch (err) {
        if (err instanceof ShipServiceError) {
          mapShipError(err);
        }
        throw err;
      }
    }),
});
