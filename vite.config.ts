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
          /*
           * Função em vez de objeto: com objeto, o Rollup leva para o chunk as dependências compartilhadas
           * (o chunk do Radix passava a importar o do Supabase, e a /demonstracao baixava os dois).
           */
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (/[\/]node_modules[\/](react|react-dom|react-router|react-router-dom|@remix-run[\/]router|scheduler)[\/]/.test(id)) return "react";
            if (/[\/]node_modules[\/]@supabase[\/]/.test(id)) return "supabase";
            if (/[\/]node_modules[\/](react-hook-form|zod|@hookform[\/]resolvers)[\/]/.test(id)) return "forms";
          },
        },
      },
    },
  };
});

/* Fim de vite.config.ts */
