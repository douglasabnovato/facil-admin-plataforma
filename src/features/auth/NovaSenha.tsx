/*
 * NovaSenha.tsx — define a nova senha depois do link de recuperação enviado por e-mail.
 */
import { useNavigate } from "react-router-dom";
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
import { Carregando } from "@/components/Comuns";
import { mensagemAuth } from "./mensagens";

const esquema = z
  .object({ senha: z.string().min(8, "Use ao menos 8 caracteres"), confirmacao: z.string() })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não conferem", path: ["confirmacao"] });
type Dados = z.infer<typeof esquema>;

/* Página de nova senha (exige a sessão aberta pelo link). */
export default function NovaSenha() {
  const { usuario, carregando } = useAuth();
  const navegar = useNavigate();
  const { register, handleSubmit, formState } = useForm<Dados>({ resolver: zodResolver(esquema) });

  const salvar = async (d: Dados) => {
    const { error } = await supabase.auth.updateUser({ password: d.senha });
    if (error) toast.error(mensagemAuth(error.message));
    else {
      toast.success("Senha alterada.");
      navegar("/", { replace: true });
    }
  };

  return (
    <LayoutAuth titulo="Nova senha">
      {carregando ? (
        <Carregando />
      ) : !usuario ? (
        <p className="text-sm text-muted-foreground">O link expirou ou já foi usado. Volte ao login e peça outro em "Esqueci a senha".</p>
      ) : (
        <form onSubmit={handleSubmit(salvar)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input id="senha" type="password" autoComplete="new-password" {...register("senha")} />
            {formState.errors.senha && <p className="text-sm text-destructive">{formState.errors.senha.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmacao">Repita a senha</Label>
            <Input id="confirmacao" type="password" autoComplete="new-password" {...register("confirmacao")} />
            {formState.errors.confirmacao && <p className="text-sm text-destructive">{formState.errors.confirmacao.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={formState.isSubmitting}>Salvar senha</Button>
        </form>
      )}
    </LayoutAuth>
  );
}

/* Fim de NovaSenha.tsx */
