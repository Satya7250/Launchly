import { router } from "./trpc.js";

import { healthRouter } from "./routes/health/route.js";
import { authRouter } from "./routes/auth/route.js";
import { workspaceRouter } from "./routes/workspace/route.js";
import { projectRouter } from "./routes/project/route.js";
import { featureRequestRouter } from "./routes/feature-request/route.js";
import { prdRouter } from "./routes/prd/route.js";
import { taskRouter } from "./routes/task/route.js";
import { githubRouter } from "./routes/github/route.js";
import { reviewRouter } from "./routes/review/route.js";
import { approvalRouter } from "./routes/approval/route.js";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  featureRequest: featureRequestRouter,
  prd: prdRouter,
  task: taskRouter,
  github: githubRouter,
  review: reviewRouter,
  approval: approvalRouter,
});


export { createContext } from "./context.js";
export type ServerRouter = typeof serverRouter;


