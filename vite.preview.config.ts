import { defineConfig } from "vite";

// Builds the preview runtime (React, the UI components, a TSX compiler and Tailwind) into one
// classic script. The app loads it inside the sandboxed iframe. Run with `pnpm build:preview`.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  define: { "process.env.NODE_ENV": '"production"' },
  build: {
    lib: {
      entry: "app/studio-preview/entry.tsx",
      formats: ["iife"],
      name: "StudioPreview",
      fileName: () => "preview-runtime.js",
    },
    outDir: "public/studio",
    emptyOutDir: true,
    copyPublicDir: false,
    target: "es2022",
  },
});
