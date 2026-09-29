/*
 * endereco.ts — CEP → endereço (BrasilAPI, com ViaCEP de reserva) e endereço → coordenadas (Nominatim/OSM).
 * Tudo gratuito e chamado do navegador. As coordenadas alimentam o match por raio (PostGIS).
 */

export interface Endereco {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
}

/* Normaliza o CEP para 8 dígitos ou devolve null. */
export function normalizarCep(cep: string): string | null {
  const d = cep.replace(/\D/g, "");
  return d.length === 8 ? d : null;
}

/* Busca o endereço do CEP; tenta BrasilAPI v2 (traz coordenadas às vezes) e cai para o ViaCEP. */
export async function buscarCep(cep: string, f: typeof fetch = fetch): Promise<Endereco | null> {
  const d = normalizarCep(cep);
  if (!d) return null;
  try {
    const r = await f(`https://brasilapi.com.br/api/cep/v2/${d}`);
    if (r.ok) {
      const j = await r.json();
      const coord = j?.location?.coordinates;
      return {
        cep: d,
        logradouro: j.street ?? "",
        bairro: j.neighborhood ?? "",
        cidade: j.city ?? "",
        uf: j.state ?? "",
        latitude: coord?.latitude ? Number(coord.latitude) : null,
        longitude: coord?.longitude ? Number(coord.longitude) : null,
      };
    }
  } catch {
    /* segue para o ViaCEP */
  }
  try {
    const r = await f(`https://viacep.com.br/ws/${d}/json/`);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.erro) return null;
    return { cep: d, logradouro: j.logradouro ?? "", bairro: j.bairro ?? "", cidade: j.localidade ?? "", uf: j.uf ?? "", latitude: null, longitude: null };
  } catch {
    return null;
  }
}

/* Coordenadas pelo Nominatim (1 requisição por vez; o navegador envia o Referer da página como identificação). */
export async function geocodificar(e: { logradouro?: string | null; numero?: string | null; bairro?: string | null; cidade: string; uf: string }, f: typeof fetch = fetch): Promise<{ latitude: number; longitude: number } | null> {
  const tentativas = [
    [e.logradouro && `${e.logradouro}${e.numero ? ", " + e.numero : ""}`, e.bairro, e.cidade, e.uf, "Brasil"],
    [e.bairro, e.cidade, e.uf, "Brasil"],
    [e.cidade, e.uf, "Brasil"],
  ].map((partes) => partes.filter(Boolean).join(", "));
  for (const q of tentativas) {
    try {
      const r = await f(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, {
        headers: { "Accept-Language": "pt-BR" },
      });
      if (!r.ok) continue;
      const j = await r.json();
      if (Array.isArray(j) && j[0]) return { latitude: Number(j[0].lat), longitude: Number(j[0].lon) };
    } catch {
      /* tenta a próxima forma */
    }
  }
  return null;
}

export interface ValorEndereco {
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
}

export const ENDERECO_VAZIO: ValorEndereco = { cep: "", logradouro: "", numero: "", bairro: "", cidade: "", uf: "", latitude: null, longitude: null };

/* Endereço mínimo para o banco: CEP, cidade e UF. */
export function enderecoValido(v: ValorEndereco): boolean {
  return !!normalizarCep(v.cep) && v.cidade.trim().length > 1 && v.uf.trim().length === 2;
}

/* Fim de endereco.ts */
