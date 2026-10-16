import { defineConfig } from "vitest/config";

// Smoke tests contra un despliegue (ver test/smoke/). No entran en `npm test`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/smoke/**/*.smoke.ts"],
    testTimeout: 30_000,
  },
});
