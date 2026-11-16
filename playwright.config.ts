/*
 * playwright.config.ts — ponta a ponta no navegador (critério 3): sobe o build de produção com `vite preview`
 * numa porta própria e roda claro e escuro. O Supabase aponta para um endereço que não existe e os testes
 * cortam as chamadas a ele: a demonstração não usa o banco, e o login mostra a falha de rede.
 */
import { defineConfig, devices } from "@playwright/test";

const PORTA = Number(process.env.PORTA_E2E ?? 4791);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://127.0.0.1:${PORTA}`, trace: "retain-on-failure", reducedMotion: "reduce" },
  projects: [
    { name: "claro", use: { ...devices["Desktop Chrome"], colorScheme: "light" } },
    { name: "escuro", use: { ...devices["Desktop Chrome"], colorScheme: "dark" } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORTA} --strictPort`,
    url: `http://127.0.0.1:${PORTA}/demonstracao`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      VITE_SUPABASE_URL: "https://supabase-e2e.invalid",
      VITE_SUPABASE_PUBLISHABLE_KEY: "chave-publica-de-teste",
      VITE_BASE: "/",
    },
  },
});

/* Fim de playwright.config.ts */
