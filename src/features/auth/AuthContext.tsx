/*
 * AuthContext.tsx — sessão do Supabase Auth e perfil do usuário (tabela perfis) para toda a aplicação.
 * O cliente do Supabase é importado sob demanda. Nas páginas públicas (demonstração, termos, privacidade),
 * a importação espera o navegador ficar ocioso, para não disputar a rede com a primeira pintura.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Perfil } from "@/lib/tipos";
import { AuthContexto, type AuthValor } from "./contexto";

/* Cliente do Supabase, carregado uma vez e sob demanda. */
const cliente = () => import("@/lib/supabase").then((m) => m.supabase);

const PUBLICAS = ["/demonstracao", "/termos", "/privacidade"];

/* Espera o navegador ficar ocioso nas páginas públicas; nas demais, segue na hora. */
function quandoPuder(): Promise<void> {
  const caminho = window.location.pathname.replace(import.meta.env.BASE_URL.replace(/\/$/, ""), "");
  if (!PUBLICAS.some((p) => caminho.startsWith(p))) return Promise.resolve();
  return new Promise((ok) => {
    const ocioso = () => ("requestIdleCallback" in window ? window.requestIdleCallback(() => ok(), { timeout: 3000 }) : setTimeout(ok, 1500));
    if (document.readyState === "complete") ocioso();
    else window.addEventListener("load", ocioso, { once: true });
  });
}

/* Provedor: acompanha a sessão e carrega o perfil quando o usuário muda. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPerfil = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setPerfil(null);
      return;
    }
    const supabase = await cliente();
    const { data } = await supabase.from("perfis").select("user_id, nome, telefone, tipo, is_admin").eq("user_id", userId).maybeSingle();
    setPerfil((data as Perfil | null) ?? null);
  }, []);

  useEffect(() => {
    let ativo = true;
    let cancelar: (() => void) | undefined;
    quandoPuder()
      .then(cliente)
      .then(async (supabase) => {
        if (!ativo) return;
        const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => {
          setSessao(nova);
          setTimeout(() => {
            carregarPerfil(nova?.user.id).finally(() => setCarregando(false));
          }, 0);
        });
        cancelar = () => sub.subscription.unsubscribe();
        const { data } = await supabase.auth.getSession();
        if (!ativo) return;
        setSessao(data.session);
        await carregarPerfil(data.session?.user.id);
      })
      .catch(() => {
        /* Falha de rede ou sessão corrompida: segue como deslogado em vez de ficar carregando para sempre. */
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
      cancelar?.();
    };
  }, [carregarPerfil]);

  const valor = useMemo<AuthValor>(
    () => ({
      sessao,
      usuario: sessao?.user ?? null,
      perfil,
      carregando,
      recarregarPerfil: () => carregarPerfil(sessao?.user.id),
      sair: async () => {
        const supabase = await cliente();
        await supabase.auth.signOut();
        setPerfil(null);
      },
    }),
    [sessao, perfil, carregando, carregarPerfil],
  );

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>;
}

/* Fim de AuthContext.tsx */
