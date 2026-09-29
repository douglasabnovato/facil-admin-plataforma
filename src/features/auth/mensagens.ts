/*
 * mensagens.ts — tradução das mensagens de erro do Supabase Auth.
 */

/* Traduz as mensagens mais comuns do Supabase Auth. */
export function mensagemAuth(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme o seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem cadastro. Tente entrar.";
  if (/password should be at least/i.test(msg)) return "A senha precisa ter ao menos 8 caracteres.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  return msg;
}

/* Fim de mensagens.ts */
