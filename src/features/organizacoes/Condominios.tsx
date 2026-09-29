/*
 * Condominios.tsx — condomínios do usuário, cadastro de condomínio (síndico ou administradora)
 * e pedido de entrada por código de convite (condôminos e conselheiros).
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, KeyRound, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina, Carregando, ErroCarga, EstadoVazio } from "@/components/Comuns";
import { CamposEndereco } from "@/components/CamposEndereco";
import { ENDERECO_VAZIO, enderecoValido, type ValorEndereco } from "@/lib/endereco";
import { ROTULO_PAPEL, formatarReais } from "@/lib/formatos";
import { criarAdministradora, criarCondominio, entrarCondominio, meusCondominios, minhasAdministradoras } from "./api";

/* Diálogo de cadastro de condomínio. */
function NovoCondominio({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const cliente = useQueryClient();
  const navegar = useNavigate();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [unidades, setUnidades] = useState("");
  const [minhaUnidade, setMinhaUnidade] = useState("");
  const [endereco, setEndereco] = useState<ValorEndereco>(ENDERECO_VAZIO);
  const [comoAdm, setComoAdm] = useState(false);
  const [admId, setAdmId] = useState<string>("nova");
  const [admNome, setAdmNome] = useState("");
  const { data: adms = [] } = useQuery({ queryKey: ["administradoras"], queryFn: minhasAdministradoras, enabled: aberto });

  const salvar = useMutation({
    mutationFn: async () => {
      let administradora: string | null = null;
      if (comoAdm) administradora = admId === "nova" ? await criarAdministradora({ nome: admNome }) : admId;
      return criarCondominio({ nome, cnpj, unidades, unidade: minhaUnidade, ...endereco, administradora_id: administradora });
    },
    onSuccess: (id) => {
      toast.success("Condomínio cadastrado. Compartilhe o código de convite com os moradores.");
      cliente.invalidateQueries({ queryKey: ["condominios"] });
      fechar();
      navegar(`/condominios/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const podeSalvar = nome.trim().length >= 3 && enderecoValido(endereco) && (!comoAdm || admId !== "nova" || admNome.trim().length >= 3);

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar condomínio</DialogTitle>
          <DialogDescription>O endereço completo só é mostrado ao fornecedor depois da contratação aprovada.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-6">
            <div className="space-y-2 sm:col-span-4">
              <Label htmlFor="c-nome">Nome do condomínio</Label>
              <Input id="c-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="c-unidades">Nº de unidades</Label>
              <Input id="c-unidades" inputMode="numeric" value={unidades} onChange={(e) => setUnidades(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="c-cnpj">CNPJ (opcional)</Label>
              <Input id="c-cnpj" inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
            </div>
            {!comoAdm && (
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="c-unidade">Sua unidade (opcional)</Label>
                <Input id="c-unidade" placeholder="Ex.: Bloco A, 101" value={minhaUnidade} onChange={(e) => setMinhaUnidade(e.target.value)} />
              </div>
            )}
          </div>
          <CamposEndereco valor={endereco} onChange={setEndereco} prefixo="c" />
          <div className="rounded-lg border p-4">
            <div className="flex items-start gap-2">
              <Checkbox id="c-adm" checked={comoAdm} onCheckedChange={(v) => setComoAdm(v === true)} />
              <Label htmlFor="c-adm" className="font-normal leading-snug">
                Cadastro como <strong>administradora</strong> (a equipe da administradora gerencia; eu não entro como síndico)
              </Label>
            </div>
            {comoAdm && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Administradora</Label>
                  <Select value={admId} onValueChange={setAdmId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nova">Nova administradora…</SelectItem>
                      {adms.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {admId === "nova" && (
                  <div className="space-y-2">
                    <Label htmlFor="c-admnome">Nome da administradora</Label>
                    <Input id="c-admnome" value={admNome} onChange={(e) => setAdmNome(e.target.value)} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button onClick={() => salvar.mutate()} disabled={!podeSalvar || salvar.isPending}>
            {salvar.isPending ? "Salvando…" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* Diálogo de entrada por código de convite. */
function EntrarPorCodigo({ aberto, fechar }: { aberto: boolean; fechar: () => void }) {
  const cliente = useQueryClient();
  const [codigo, setCodigo] = useState("");
  const [unidade, setUnidade] = useState("");
  const entrar = useMutation({
    mutationFn: () => entrarCondominio(codigo, unidade),
    onSuccess: () => {
      toast.success("Pedido enviado. O síndico vai aprovar a sua entrada.");
      cliente.invalidateQueries({ queryKey: ["condominios"] });
      setCodigo("");
      setUnidade("");
      fechar();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entrar em um condomínio</DialogTitle>
          <DialogDescription>Peça ao síndico o código de convite de 8 caracteres.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="e-codigo">Código de convite</Label>
            <Input id="e-codigo" autoCapitalize="characters" maxLength={12} className="font-mono uppercase tracking-widest" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-unidade">Sua unidade</Label>
            <Input id="e-unidade" placeholder="Ex.: Bloco B, apto 204" value={unidade} onChange={(e) => setUnidade(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={fechar}>Cancelar</Button>
          <Button onClick={() => entrar.mutate()} disabled={codigo.trim().length < 6 || !unidade.trim() || entrar.isPending}>Pedir entrada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* Página de condomínios. */
export default function Condominios() {
  const [novo, setNovo] = useState(false);
  const [codigo, setCodigo] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["condominios"], queryFn: meusCondominios });

  return (
    <>
      <CabecalhoPagina
        titulo="Condomínios"
        descricao="Onde você atua como síndico, administradora, conselheiro ou morador."
        acoes={
          <>
            <Button variant="outline" onClick={() => setCodigo(true)}><KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />Tenho um código</Button>
            <Button onClick={() => setNovo(true)}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Cadastrar condomínio</Button>
          </>
        }
      />
      {isLoading ? <Carregando /> : error ? <ErroCarga erro={error} tentar={refetch} /> : !data?.length ? (
        <EstadoVazio
          titulo="Você ainda não participa de nenhum condomínio."
          texto="Síndicos e administradoras cadastram o condomínio. Moradores e conselheiros entram com o código de convite."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <li key={c.id}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Building2 className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <Link to={`/condominios/${c.id}`} className="font-semibold text-foreground hover:underline">{c.nome}</Link>
                      <p className="text-sm text-muted-foreground">{c.cidade}/{c.uf}{c.unidade ? ` · ${c.unidade}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.papel && <Badge variant="secondary">{ROTULO_PAPEL[c.papel]}</Badge>}
                    {c.status === "pendente" && <Badge variant="outline" className="border-warning/40 text-warning">Aguardando aprovação</Badge>}
                    {c.status === "recusado" && <Badge variant="outline" className="text-destructive">Pedido recusado</Badge>}
                    {c.membros_pendentes > 0 && (
                      <Badge variant="outline" className="border-warning/40 text-warning"><Users className="mr-1 h-3 w-3" aria-hidden="true" />{c.membros_pendentes} pedido(s)</Badge>
                    )}
                  </div>
                  <p className="mt-auto text-xs text-muted-foreground">
                    Mínimo de {c.min_propostas} propostas · conselho acima de {formatarReais(c.limite_conselho)}
                  </p>
                  {c.status === "ativo" && (
                    <Button asChild variant="outline" size="sm" className="self-start">
                      <Link to={`/condominios/${c.id}`}>Abrir</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <NovoCondominio aberto={novo} fechar={() => setNovo(false)} />
      <EntrarPorCodigo aberto={codigo} fechar={() => setCodigo(false)} />
    </>
  );
}

/* Fim de Condominios.tsx */
