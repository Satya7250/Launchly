// Set env vars before any imports
process.env.INNGEST_EVENT_KEY = "dev";

import("./test-e2e.js").catch((err) => {
  console.error("Failed to run test:", err);
  process.exit(1);
});
