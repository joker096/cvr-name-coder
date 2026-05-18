import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["import", "browser"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "src/components/chat/*.test.tsx",
      "src/components/settings/*.test.tsx",
      "src/hooks/*.test.ts",
      "src/services/__tests__/*.test.ts",
    ],
    deps: {
      interopDefault: true,
    },
  },
  esbuild: {
    target: "es2022",
  },
});
