import { defineConfig } from "tsdown";

/** Self-contained build for local link / npm pack (no @deepseek-ai monorepo). */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node22",
  external: [/^@deepseek-ai\//],
});
