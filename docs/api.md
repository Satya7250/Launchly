# API Documentation

This document describes the tRPC and OpenAPI services provided by the Launchly server backend.

---

## Architecture Overview

Launchly uses a unified tRPC (version 11) API exposed from the `@repo/trpc` library and mounted inside `apps/api`.
The API compiles to OpenAPI standards (via `trpc-to-openapi`) to allow external developer clients to query services over standard REST protocols.

---

## Authentication Requirements

Procedures within Launchly are divided into three main categories:
1. **`publicProcedure`**: No auth headers required. Open to any client.
2. **`protectedProcedure`**: Requires session headers. BetterAuth manages identity mapping, validating authorization headers before routing to resolvers.
3. **`workspaceProcedure`**: Extends `protectedProcedure`. Ensures the user is authorized to perform changes in the requested tenant workspace. Injects the active organization workspace object into the context at `ctx.workspace.active`.

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
- **Input Schema**: None
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
- **Input Schema**: None
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

---

### 4. `github` Router
Exposes procedures for managing connected repositories and tracking synchronized pull requests.

#### `connect`
- **Type**: `mutation`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    installationId: z.number(),
    githubRepositoryId: z.number(),
    owner: z.string(),
    name: z.string(),
    defaultBranch: z.string(),
    private: z.boolean(),
    projectId: z.string().uuid().optional(),
  })
  ```
- **Output Schema**: `Repository` (the created repository DB record)
- **Errors**:
  - `UNAUTHORIZED` (if user is not registered in the active workspace context)
  - `INTERNAL_SERVER_ERROR` (if repository insertion fails)
- **Description**: Registers a repository under the active workspace, linking it to a GitHub App installation record. If the installation record does not exist in the database yet, fetches details from GitHub and registers it.

#### `repositories`
- **Type**: `query`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    fetchAvailableForInstallationId: z.number().optional(),
  })
  ```
- **Output Schema**:
  ```typescript
  z.object({
    connected: z.array(Repository),
    available: z.array(z.object({
      githubRepositoryId: z.number(),
      name: z.string(),
      fullName: z.string(),
      owner: z.string(),
      defaultBranch: z.string(),
      private: z.boolean(),
      installationId: z.number(),
    })),
    installations: z.array(githubInstallationModel)
  })
  ```
- **Errors**:
  - `ERROR` (if the request checks an installation that belongs to a different workspace)
- **Description**: Lists all repositories connected to the active workspace. If `fetchAvailableForInstallationId` is passed, fetches all repositories accessible under that installation from GitHub's API. Also returns all active installations connected to the workspace.

#### `pullRequests`
- **Type**: `query`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
    repositoryId: z.string().uuid().optional(),
    processingStatus: z.enum(["RECEIVED", "PROCESSING", "READY_FOR_AI_REVIEW", "FAILED"]).optional(),
  })
  ```
- **Output Schema**:
  ```typescript
  z.object({
    items: z.array(z.object({
      pullRequest: PullRequest,
      repositoryName: z.string(),
      repositoryFullName: z.string(),
    })),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      totalCount: z.number(),
      totalPages: z.number(),
    })
  })
  ```
- **Description**: Returns a paginated list of pull requests connected to the workspace. Supports filtering by repository and lifecycle processing status.

#### `pullRequestById`
- **Type**: `query`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    id: z.string().uuid(),
  })
  ```
- **Output Schema**:
  ```typescript
  z.object({
    pullRequest: PullRequest,
    repository: Repository,
    files: z.array(PullRequestFile),
  })
  ```
- **Errors**:
  - `ERROR` (if pull request is not found or is in a different workspace)
- **Description**: Fetches pull request parameters and the files modified inside the PR.

#### `pullRequestDiff`
- **Type**: `query`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    id: z.string().uuid(),
  })
  ```
- **Output Schema**:
  ```typescript
  z.object({
    diff: z.string()
  })
  ```
- **Errors**:
  - `ERROR` (if pull request is not found or repository path metadata is invalid)
- **Description**: Connects to GitHub on-demand and returns the raw file patch/diff format of the pull request. Used for large diff lazy-loading.

---

### 5. `workspace` Router
Exposes procedures for querying, switching, creating, and seeding workspaces.

#### `getCurrentWorkspace`
- **Type**: `query`
- **Procedure Access**: `workspaceProcedure`
- **Input Schema**: None
- **Output Schema**:
  ```typescript
  z.object({
    workspace: Organization,
    role: z.string(),
    membership: Membership,
  })
  ```
- **Description**: Returns the active workspace organization detail, membership ID, and membership role context.

#### `getWorkspaces`
- **Type**: `query`
- **Procedure Access**: `authedProcedure`
- **Input Schema**: None
- **Output Schema**:
  ```typescript
  z.array(z.object({
    workspace: Organization,
    role: z.string()
  }))
  ```
- **Description**: Lists all organization workspaces where the logged-in user holds membership.

#### `switchWorkspace`
- **Type**: `mutation`
- **Procedure Access**: `authedProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    workspaceId: z.string().uuid()
  })
  ```
- **Output Schema**:
  ```typescript
  z.object({
    workspace: Organization,
    role: z.string()
  })
  ```
- **Errors**:
  - `WORKSPACE_ACCESS_DENIED` (if the user is not a member of the requested workspace)
- **Description**: Switches the active workspace for the logged-in session, setting the `active_workspace_id` cookie response header.

#### `createWorkspace`
- **Type**: `mutation`
- **Procedure Access**: `authedProcedure`
- **Input Schema**:
  ```typescript
  z.object({
    name: z.string().min(1)
  })
  ```
- **Output Schema**:
  ```typescript
  z.object({
    workspace: Organization,
    role: z.literal("OWNER")
  })
  ```
- **Description**: Creates a new organization workspace, assigns the active user as `OWNER`, and sets the active workspace cookie header.

#### `seedDemoWorkspace`
- **Type**: `mutation`
- **Procedure Access**: `authedProcedure`
- **Input Schema**: None
- **Output Schema**:
  ```typescript
  z.object({
    workspace: Organization
  })
  ```
- **Description**: Seeds the database with highly comprehensive, premium demo data (including workspaces, projects, specifications, PRDs, Kanban task boards, and signature-verified mock pull request files) scoped to the logged-in user account, returning the newly created organization model details.

