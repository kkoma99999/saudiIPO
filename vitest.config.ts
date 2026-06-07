import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // The first TS tests arrive in Phase 4 (metrics). Until then npm test should
    // pass rather than error on an empty suite. Python tests run under pytest.
    passWithNoTests: true,
  },
});
