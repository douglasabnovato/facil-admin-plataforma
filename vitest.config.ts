/*
 * vitest.config.ts — testes de unidade e de componentes (jsdom).
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: { VITE_SUPABASE_URL: "http://localhost:54321", VITE_SUPABASE_PUBLISHABLE_KEY: "chave-de-teste" },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});

/* Fim de vitest.config.ts */
