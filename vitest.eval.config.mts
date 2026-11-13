import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Real API calls: only run on demand via `pnpm eval`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["eval/**/*.eval.ts"],
  },
});
