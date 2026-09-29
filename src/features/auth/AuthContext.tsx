/*
 * AuthContext.tsx — sessão do Supabase Auth e perfil do usuário (tabela perfis) para toda a aplicação.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Perfil } from "@/lib/tipos";
import { AuthContexto, type AuthValor } from "./contexto";

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
    const { data } = await supabase.from("perfis").select("user_id, nome, telefone, tipo, is_admin").eq("user_id", userId).maybeSingle();
    setPerfil((data as Perfil | null) ?? null);
  }, []);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      await carregarPerfil(data.session?.user.id);
      if (ativo) setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
      setTimeout(() => {
        carregarPerfil(nova?.user.id).finally(() => setCarregando(false));
      }, 0);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
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
        await supabase.auth.signOut();
        setPerfil(null);
      },
    }),
    [sessao, perfil, carregando, carregarPerfil],
  );

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>;
}

/* Fim de AuthContext.tsx */
