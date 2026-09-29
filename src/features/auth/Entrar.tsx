/*
 * Entrar.tsx — login por e-mail e senha, com envio de link para redefinir a senha.
 */
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./contexto";
import { LayoutAuth } from "./LayoutAuth";
import { urlDoApp } from "@/app/urls";
import { mensagemAuth } from "./mensagens";

const esquema = z.object({
  email: z.string().trim().email("Informe um e-mail válido"),
  senha: z.string().min(1, "Informe a senha"),
});
type Dados = z.infer<typeof esquema>;

/* Página de login. */
export default function Entrar() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [enviandoLink, setEnviandoLink] = useState(false);
  const { register, handleSubmit, getValues, formState } = useForm<Dados>({ resolver: zodResolver(esquema) });
  const destino = (local.state as { de?: string } | null)?.de ?? "/";

  if (usuario) return <Navigate to={destino} replace />;

  const entrar = async (d: Dados) => {
    const { error } = await supabase.auth.signInWithPassword({ email: d.email, password: d.senha });
    if (error) {
      toast.error(mensagemAuth(error.message));
      return;
    }
    navegar(destino, { replace: true });
  };

  const esqueci = async () => {
    const email = getValues("email")?.trim();
    if (!email || !z.string().email().safeParse(email).success) {
      toast.error("Digite o seu e-mail no campo acima e clique de novo.");
      return;
    }
    setEnviandoLink(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: urlDoApp("/nova-senha") });
    setEnviandoLink(false);
    if (error) toast.error(mensagemAuth(error.message));
    else toast.success("Enviamos um link para redefinir a senha. Confira o seu e-mail.");
  };

  return (
    <LayoutAuth
      titulo="Entrar"
      subtitulo="Acesse a plataforma do seu condomínio ou da sua empresa."
      rodape={<>Ainda não tem conta? <Link to="/cadastro" className="font-medium text-primary underline-offset-4 hover:underline">Cadastre-se</Link></>}
    >
      <form onSubmit={handleSubmit(entrar)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!formState.errors.email} />
          {formState.errors.email && <p className="text-sm text-destructive">{formState.errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="senha">Senha</Label>
            <button type="button" onClick={esqueci} disabled={enviandoLink} className="text-sm text-primary underline-offset-4 hover:underline">
              Esqueci a senha
            </button>
          </div>
          <Input id="senha" type="password" autoComplete="current-password" {...register("senha")} aria-invalid={!!formState.errors.senha} />
          {formState.errors.senha && <p className="text-sm text-destructive">{formState.errors.senha.message}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </LayoutAuth>
  );
}

/* Fim de Entrar.tsx */
