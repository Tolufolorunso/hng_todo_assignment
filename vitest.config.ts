import { defineConfig, configDefaults } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Keep the Vitest defaults and additionally ignore local tool artifacts.
    // .kilo holds Kilo Code worktrees (ignored via .git/info/exclude) whose
    // stale test copies otherwise get globbed and fail against current source.
    exclude: [...configDefaults.exclude, "**/.kilo/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
