# API Documentation

This document describes the tRPC and OpenAPI services provided by the Launchly server backend.

---

## Architecture Overview

Launchly uses a unified tRPC (version 11) API exposed from the `@repo/trpc` library and mounted inside `apps/api`.
The API compiles to OpenAPI standards (via `trpc-to-openapi`) to allow external developer clients to query services over standard REST protocols.

---

## Authentication Requirements

Procedures within Launchly are divided into two main categories:
1. **`publicProcedure`**: No auth headers required. Open to any client.
2. **`protectedProcedure`**: Requires session headers. BetterAuth manages identity mapping, validating authorization headers before routing to resolvers.

---

## Rate Limits

All requests entering `/trpc/*` are throttled at the Express gateway router level. External clients are limited based on their origin IP and subscription tiers to maintain high availability.

---

## Routers & Procedures

### 1. `health` Router
Handles sanity checks and system heartbeat queries.

#### `getHealth`
- **Type**: `query`
- **Procedure Access**: `publicProcedure` (Anonymous)
- **OpenAPI Configuration**:
  - **Method**: `GET`
  - **Path**: `/health`
- **Input Schema**: `zodUndefinedModel` (No inputs)
- **Output Schema**:
  ```typescript
  z.object({
    status: z.literal("healthy").describe("status of the server")
  })
  ```
- **Description**: Returns `{ status: "healthy" }` if the backend Express and routing engines are functional.

---

### 2. `auth` Router
Exposes authorization configurations and provider parameters.

#### `getSupportedAuthenticationProviders`
- **Type**: `query`
- **Procedure Access**: `publicProcedure` (Anonymous)
- **OpenAPI Configuration**:
  - **Method**: `GET`
  - **Path**: `/authentication/supported-providers`
  - **Tags**: `["Authentication"]`
- **Input Schema**: `zodUndefinedModel` (No inputs)
- **Output Schema**:
  ```typescript
  z.readonly(
    z.array(
      z.object({
        provider: z.enum(["GOOGLE_OAUTH"]),
        displayName: z.string().optional(),
        displayText: z.string().optional(),
        authUrl: z.string(),
      })
    )
  )
  ```
- **Description**: Checks server environment configuration for OAuth credentials. If Google OAuth credentials are present in environment variables, it generates and returns an OAuth authorization URL allowing clients to initiate a sign-in flow.
