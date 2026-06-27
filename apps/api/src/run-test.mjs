import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

process.env.INNGEST_DEV = "1";
process.env.INNGEST_EVENT_KEY = "dev";

const child = spawn(
  "node",
  [
    "--env-file", "../../.env",
    "--import", "file:///D:/Launchly/node_modules/.pnpm/tsx@4.21.0/node_modules/tsx/dist/loader.mjs",
    "./src/test-e2e.ts",
  ],
  {
    cwd: "D:/Launchly/apps/api",
    stdio: "inherit",
    env: { ...process.env },
  }
);

child.on("exit", (code) => process.exit(code ?? 1));
