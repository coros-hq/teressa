import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// Server code reads SUPABASE_* from process.env; Vite only exposes .env to client code by default.
// In production the host provides these variables directly.
export default defineConfig(({ mode }) => {
  Object.assign(process.env, { ...loadEnv(mode, process.cwd(), ""), ...process.env });
  return config;
});

const config = {
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
    // one copy of React, so hooks never see a null dispatcher
    dedupe: ["react", "react-dom"],
  },
  // Pre-bundle these up front. If Vite discovers them lazily while the dev server is running,
  // it re-optimizes mid-session and can leave two copies of React loaded.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router",
      "lucide-react",
      "radix-ui",
      "class-variance-authority",
      "cn",
    ],
  },
};
