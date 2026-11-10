/*
 * config.ts — diz se o .env do Supabase foi preenchido, sem carregar o cliente do Supabase.
 * Fica separado de supabase.ts para que as páginas públicas (demonstração) não baixem o supabase-js na primeira carga.
 */
export const configurado = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

/* Fim de config.ts */
