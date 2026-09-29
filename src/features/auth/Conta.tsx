/*
 * Conta.tsx — dados do usuário (nome e telefone) e tipo de conta.
 */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CabecalhoPagina } from "@/components/Comuns";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./contexto";

const ROTULO_TIPO = { gestor: "Síndico ou administradora", condomino: "Morador", fornecedor: "Fornecedor" } as const;

/* Página de dados da conta. */
export default function Conta() {
  const { perfil, usuario, recarregarPerfil } = useAuth();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  useEffect(() => {
    setNome(perfil?.nome ?? "");
    setTelefone(perfil?.telefone ?? "");
  }, [perfil]);
  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("perfis").update({ nome: nome.trim(), telefone: telefone.trim() || null }).eq("user_id", usuario!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await recarregarPerfil();
      toast.success("Dados salvos");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <CabecalhoPagina titulo="Meus dados" descricao={perfil ? `Conta de ${ROTULO_TIPO[perfil.tipo]}${perfil.is_admin ? " · administrador" : ""}` : undefined} />
      <Card className="max-w-xl">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2"><Label htmlFor="ct-nome">Nome</Label><Input id="ct-nome" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="ct-tel">Celular (WhatsApp)</Label><Input id="ct-tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="ct-email">E-mail</Label><Input id="ct-email" value={usuario?.email ?? ""} disabled /></div>
          <p className="text-xs text-muted-foreground">O telefone só é mostrado ao fornecedor depois de uma contratação aprovada em que você seja responsável.</p>
          <Button onClick={() => salvar.mutate()} disabled={nome.trim().length < 3 || salvar.isPending}>Salvar</Button>
        </CardContent>
      </Card>
    </>
  );
}

/* Fim de Conta.tsx */
