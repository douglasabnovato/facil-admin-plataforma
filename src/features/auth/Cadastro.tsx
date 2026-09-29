/*
 * Cadastro.tsx — criação de conta com o tipo de uso (condomínio, condômino ou fornecedor).
 * O tipo vai nos metadados do Auth; o gatilho criar_perfil() grava a tabela perfis.
 */
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, Home, Wrench, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { TipoPerfil } from "@/lib/tipos";
import { useAuth } from "./contexto";
import { LayoutAuth } from "./LayoutAuth";
import { mensagemAuth } from "./mensagens";
import { urlDoApp } from "@/app/urls";

const esquema = z.object({
  nome: z.string().trim().min(3, "Informe o seu nome"),
  telefone: z.string().trim().regex(/^[\d\s()+-]{10,20}$/, "Informe um telefone com DDD"),
  email: z.string().trim().email("Informe um e-mail válido"),
  senha: z.string().min(8, "Use ao menos 8 caracteres"),
  aceite: z.boolean().refine((v) => v, "É preciso aceitar os termos"),
});
type Dados = z.infer<typeof esquema>;

const TIPOS: Array<{ valor: TipoPerfil; titulo: string; texto: string; icone: typeof Building2 }> = [
  { valor: "gestor", titulo: "Síndico ou administradora", texto: "Publico as necessidades do condomínio e comparo propostas.", icone: Building2 },
  { valor: "condomino", titulo: "Morador (condômino)", texto: "Sugiro melhorias e peço orçamentos para a minha unidade.", icone: Home },
  { valor: "fornecedor", titulo: "Fornecedor", texto: "Presto serviços ou vendo produtos para condomínios.", icone: Wrench },
];

/* Página de cadastro. */
export default function Cadastro() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const inicial = TIPOS.some((t) => t.valor === params.get("tipo")) ? (params.get("tipo") as TipoPerfil) : "gestor";
  const [tipo, setTipo] = useState<TipoPerfil>(inicial);
  const [emailEnviado, setEmailEnviado] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState } = useForm<Dados>({ resolver: zodResolver(esquema), defaultValues: { aceite: false } });

  if (usuario) return <Navigate to="/" replace />;

  const cadastrar = async (d: Dados) => {
    const { data, error } = await supabase.auth.signUp({
      email: d.email,
      password: d.senha,
      options: { data: { nome: d.nome, telefone: d.telefone, tipo }, emailRedirectTo: urlDoApp("/") },
    });
    if (error) {
      toast.error(mensagemAuth(error.message));
      return;
    }
    if (data.session) navegar("/", { replace: true });
    else setEmailEnviado(d.email);
  };

  if (emailEnviado) {
    return (
      <LayoutAuth titulo="Confirme o seu e-mail">
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="h-10 w-10 text-success" aria-hidden="true" />
          <p>Enviamos um link de confirmação para <strong>{emailEnviado}</strong>.</p>
          <p className="text-sm text-muted-foreground">Abra o e-mail e clique no link. Depois é só entrar.</p>
          <Button asChild variant="outline" className="mt-2"><Link to="/entrar">Ir para o login</Link></Button>
        </div>
      </LayoutAuth>
    );
  }

  return (
    <LayoutAuth
      titulo="Criar conta"
      subtitulo="Gratuito durante o piloto."
      rodape={<>Já tem conta? <Link to="/entrar" className="font-medium text-primary underline-offset-4 hover:underline">Entrar</Link></>}
    >
      <form onSubmit={handleSubmit(cadastrar)} className="space-y-4" noValidate>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Como você vai usar a FacilAdmin?</legend>
          <div role="radiogroup" className="grid gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.valor}
                type="button"
                role="radio"
                aria-checked={tipo === t.valor}
                onClick={() => setTipo(t.valor)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                  tipo === t.valor ? "border-primary bg-secondary" : "hover:bg-muted",
                )}
              >
                <t.icone className={cn("mt-0.5 h-5 w-5 shrink-0", tipo === t.valor ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-medium">{t.titulo}</span>
                  <span className="block text-xs text-muted-foreground">{t.texto}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" autoComplete="name" {...register("nome")} />
          {formState.errors.nome && <p className="text-sm text-destructive">{formState.errors.nome.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Celular (WhatsApp)</Label>
          <Input id="telefone" type="tel" autoComplete="tel" placeholder="(32) 99999-0000" {...register("telefone")} />
          {formState.errors.telefone && <p className="text-sm text-destructive">{formState.errors.telefone.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {formState.errors.email && <p className="text-sm text-destructive">{formState.errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" autoComplete="new-password" {...register("senha")} />
          {formState.errors.senha && <p className="text-sm text-destructive">{formState.errors.senha.message}</p>}
        </div>
        <div className="flex items-start gap-2">
          <Checkbox id="aceite" checked={watch("aceite") === true} onCheckedChange={(v) => setValue("aceite", v === true, { shouldValidate: true })} />
          <Label htmlFor="aceite" className="text-sm font-normal leading-snug">
            Li e aceito os <Link to="/termos" className="text-primary underline">Termos de Uso</Link> e a{" "}
            <Link to="/privacidade" className="text-primary underline">Política de Privacidade</Link>.
          </Label>
        </div>
        {formState.errors.aceite && <p className="text-sm text-destructive">{formState.errors.aceite.message}</p>}
        <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Criando conta…" : "Criar conta"}
        </Button>
      </form>
    </LayoutAuth>
  );
}

/* Fim de Cadastro.tsx */
