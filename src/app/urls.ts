/*
 * urls.ts — endereço absoluto de uma rota do app, respeitando o caminho publicado (VITE_BASE).
 * Usado nos links de e-mail do Auth (confirmação e nova senha).
 */

/* Ex.: urlDoApp("/nova-senha") → https://usuario.github.io/facil-admin-plataforma/nova-senha */
export function urlDoApp(rota: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}${rota}`;
}

/* Fim de urls.ts */
