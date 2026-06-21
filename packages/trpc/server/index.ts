import { router } from "./trpc.js";

import { healthRouter } from "./routes/health/route.js";
import { authRouter } from "./routes/auth/route.js";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
});

export { createContext } from "./context.js";
export type ServerRouter = typeof serverRouter;
