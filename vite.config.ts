/*
 * vite.config.ts — build do front. VITE_BASE define o caminho publicado
 * (ex.: /facil-admin-plataforma/ no GitHub Pages; / em ambiente local).
 */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env.VITE_BASE || "/",
    server: { host: "127.0.0.1", port: 5173 },
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js"],
            forms: ["react-hook-form", "zod", "@hookform/resolvers"],
            radix: ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs"],
          },
        },
      },
    },
  };
});

/* Fim de vite.config.ts */
