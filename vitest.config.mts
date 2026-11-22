import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    passWithNoTests: true,
    // Lädt .env.local und .env.test.local (Supabase-URL, Testbenutzer).
    env: loadEnv(mode, process.cwd(), ""),
    // DB-Tests laufen gegen das Cloud-Projekt und brauchen etwas Zeit.
    testTimeout: 20_000,
  },
}));
