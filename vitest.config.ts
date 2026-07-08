import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Container sessions may export NODE_ENV=production, which makes React load
// its production build in tests (no React.act) and vite resolve production
// conditions. Tests must always run in test mode.
(process.env as Record<string, string>).NODE_ENV = "test";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        // next-auth's ESM does `import 'next/server'` (extensionless); Node
        // can't resolve it because next has no exports map — let vite inline it
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
