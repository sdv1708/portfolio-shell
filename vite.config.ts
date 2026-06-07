import { defineConfig } from "vite";

// Pure static build. Output goes to dist/ ready for Cloudflare Workers
// Static Assets. The optional @mlc-ai/web-llm dependency is loaded from a
// CDN at runtime, so it is excluded from the bundle.
export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    outDir: "dist",
    assetsInlineLimit: 0,
  },
});
