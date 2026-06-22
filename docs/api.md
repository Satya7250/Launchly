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

---

### 3. `task` Router
Exposes procedures for managing engineering tasks, dragging statuses/positions, and tracking generation audits.

#### `generate`
- **Type**: `mutation`
- **Procedure Access**: `workspaceProcedure` (Workspace scoped)
- **Input Schema**:
  ```typescript
  z.object({
    prdId: z.string().uuid()
  })
  ```
- **Output Schema**:
  ```typescript
  z.object({
    success: z.boolean(),
    generationId: z.string().uuid()
  })
  ```
- **Errors**:
  - `WORKSPACE_NOT_FOUND` (if PRD or Feature Request is missing)
  - `CONFLICT` (if another task generation is already active for this PRD)
- **Description**: Places a task generation job onto the Inngest queue, inserting an audit record with `QUEUED` status and serializing requests via workspace isolation.

#### `list`
- **Type**: `query`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    prdId: z.string().uuid(),
    version: z.number().optional()
  })
  ```
- **Output Schema**: `z.array(engineeringTaskModel)`
- **Description**: Returns all engineering tasks associated with a specific PRD and version. Defaults to the latest version.

#### `listVersions`
- **Type**: `query`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    prdId: z.string().uuid()
  })
  ```
- **Output Schema**: `z.array(z.number())`
- **Description**: Lists all task iteration versions generated for a PRD, sorted in descending order.

#### `updateStatus`
- **Type**: `mutation`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    taskId: z.string().uuid(),
    status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"])
  })
  ```
- **Output Schema**: `engineeringTaskModel`
- **Description**: Updates the workflow state of a specific engineering task. Enforces workspace ownership.

#### `updatePosition`
- **Type**: `mutation`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    taskId: z.string().uuid(),
    position: z.number()
  })
  ```
- **Output Schema**: `engineeringTaskModel`
- **Description**: Updates the positional index of a task within its Kanban column for persistent ordering.

#### `delete`
- **Type**: `mutation`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    taskId: z.string().uuid()
  })
  ```
- **Output Schema**: `engineeringTaskModel`
- **Description**: Deletes an engineering task from the database.

#### `getGenerationStatus`
- **Type**: `query`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    prdId: z.string().uuid()
  })
  ```
- **Output Schema**:
  ```typescript
  z.object({
    status: z.enum(["NOT_STARTED", "QUEUED", "GENERATING", "COMPLETED", "FAILED"]),
    error: z.string().nullable(),
    startedAt: z.date().nullable(),
    completedAt: z.date().nullable()
  })
  ```
- **Description**: Retrieves the status of the latest task breakdown generation for a PRD.

#### `getGenerationHistory`
- **Type**: `query`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    prdId: z.string().uuid()
  })
  ```
- **Output Schema**: `z.array(taskGenerationAuditModel)`
- **Description**: Lists all generation history audit records for a PRD.
