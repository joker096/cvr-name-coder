import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["import", "browser"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules",
      "dist",
    ],
    deps: {
      interopDefault: true,
    },
  },
  esbuild: {
    target: "es2022",
  },
});
