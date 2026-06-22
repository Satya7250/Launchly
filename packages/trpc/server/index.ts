import { router } from "./trpc.js";

import { healthRouter } from "./routes/health/route.js";
import { authRouter } from "./routes/auth/route.js";
import { workspaceRouter } from "./routes/workspace/route.js";
import { projectRouter } from "./routes/project/route.js";
import { featureRequestRouter } from "./routes/feature-request/route.js";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  featureRequest: featureRequestRouter,
});

export { createContext } from "./context.js";
export type ServerRouter = typeof serverRouter;

