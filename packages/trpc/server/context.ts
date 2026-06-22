import * as trpcExpress from "@trpc/server/adapters/express";
import crypto from "node:crypto";
import { auth } from "@repo/auth";
import { db, eq, and, isNull } from "@repo/database";
import { membershipsTable, organizationsTable } from "@repo/database/schema";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const list: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join("="));
    }
  });
  return list;
}

export async function createContext({ req, res }: trpcExpress.CreateExpressContextOptions) {
  const requestId = crypto.randomUUID();

  // Fetch authentication session using BetterAuth
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as any),
  });

  let authContext = null;
  let workspaceContext = null;

  if (session?.session && session?.user) {
    authContext = {
      session: session.session,
      user: session.user,
    };

    // Parse the active workspace ID cookie
    const cookies = parseCookies(req.headers.cookie);
    const cookieWorkspaceId = cookies["active_workspace_id"];

    let resolvedMembership = null;

    // Validate the cookie workspace ID if present
    if (cookieWorkspaceId) {
      const [record] = await db
        .select({
          membership: membershipsTable,
          organization: organizationsTable,
        })
        .from(membershipsTable)
        .innerJoin(
          organizationsTable,
          eq(membershipsTable.organizationId, organizationsTable.id)
        )
        .where(
          and(
            eq(membershipsTable.userId, session.user.id),
            eq(membershipsTable.organizationId, cookieWorkspaceId),
            isNull(organizationsTable.deletedAt)
          )
        )
        .limit(1);

      if (record) {
        resolvedMembership = record;
      }
    }

    // If cookie was missing or invalid, fall back to first active workspace membership
    if (!resolvedMembership) {
      const [fallbackRecord] = await db
        .select({
          membership: membershipsTable,
          organization: organizationsTable,
        })
        .from(membershipsTable)
        .innerJoin(
          organizationsTable,
          eq(membershipsTable.organizationId, organizationsTable.id)
        )
        .where(
          and(
            eq(membershipsTable.userId, session.user.id),
            isNull(organizationsTable.deletedAt)
          )
        )
        .orderBy(membershipsTable.createdAt)
        .limit(1);

      if (fallbackRecord) {
        resolvedMembership = fallbackRecord;

        // Automatically update cookie to point to the resolved fallback workspace
        if (res) {
          res.cookie("active_workspace_id", fallbackRecord.organization.id, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
          });
        }
      } else {
        // Clear cookie if no workspace exists at all
        if (res && cookieWorkspaceId) {
          res.clearCookie("active_workspace_id", {
            path: "/",
          });
        }
      }
    }

    if (resolvedMembership) {
      workspaceContext = {
        active: resolvedMembership.organization,
        membership: resolvedMembership.membership,
        role: resolvedMembership.membership.role,
      };
    }
  }

  return {
    req,
    res,
    requestId,
    auth: authContext,
    workspace: workspaceContext,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
