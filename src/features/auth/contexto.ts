/*
 * contexto.ts — contexto de autenticação e o hook useAuth.
 */
import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Perfil } from "@/lib/tipos";

export interface AuthValor {
  sessao: Session | null;
  usuario: User | null;
  perfil: Perfil | null;
  carregando: boolean;
  recarregarPerfil: () => Promise<void>;
  sair: () => Promise<void>;
}

export const AuthContexto = createContext<AuthValor | undefined>(undefined);

/* Acesso ao contexto de autenticação. */
export function useAuth(): AuthValor {
  const ctx = useContext(AuthContexto);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

/* Fim de contexto.ts */
