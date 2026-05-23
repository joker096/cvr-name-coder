import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const testSetupPath = fileURLToPath(new URL("./src/test-setup.ts", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["import", "browser"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(rootDir, "."),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [testSetupPath],
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
