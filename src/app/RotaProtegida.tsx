/*
 * RotaProtegida.tsx — exige login (e, opcionalmente, perfil admin) antes de mostrar a rota.
 */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/contexto";
import { Carregando } from "@/components/Comuns";

/* Envia para /entrar guardando a rota de origem. */
export function RotaProtegida({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { usuario, perfil, carregando } = useAuth();
  const local = useLocation();
  if (carregando) return <Carregando />;
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: local.pathname + local.search }} />;
  if (admin && !perfil?.is_admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/* Fim de RotaProtegida.tsx */
