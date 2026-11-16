/*
 * destino.ts — destino depois do login. Aceita só caminhos locais do app (começam com uma barra só).
 * Recusa "//host", "/\host", barras invertidas (também codificadas), esquemas e caracteres de controle,
 * que o React Router 6 pode tratar como navegação externa (aviso GHSA-wrjc-x8rr-h8h6;
 * ver docs/adr/0001-alertas-react-router-zod.md).
 */

/* Barra invertida ou caractere de controle (0 a 31 e 127). */
function temCaractereProibido(texto: string): boolean {
  for (const c of texto) {
    const codigo = c.charCodeAt(0);
    if (c === "\\" || codigo < 32 || codigo === 127) return true;
  }
  return false;
}

export function destinoSeguro(de: unknown, padrao = "/"): string {
  if (typeof de !== "string" || de.length === 0 || de.length > 2048) return padrao;
  if (!de.startsWith("/") || de.startsWith("//") || temCaractereProibido(de)) return padrao;
  try {
    const url = new URL(de, "https://app.invalid");
    if (url.origin !== "https://app.invalid") return padrao;
    /* Também recusa a barra invertida ou a barra dupla codificadas (%5C, %2F%2F), que o roteador decodifica. */
    const decodificado = decodeURIComponent(url.pathname);
    if (decodificado.startsWith("//") || temCaractereProibido(decodificado)) return padrao;
    return url.pathname + url.search + url.hash;
  } catch {
    return padrao;
  }
}

/* Fim de destino.ts */
