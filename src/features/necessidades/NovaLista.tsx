/*
 * NovaLista.tsx — criação e edição de lista de necessidades (itens por categoria).
 * Síndico/administradora: rascunho do condomínio. Morador: sugestão ao síndico ou pedido da própria unidade.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CabecalhoPagina, Carregando, ErroCarga } from "@/components/Comuns";
import { dataISO, ROTULO_RECORRENCIA, rotuloCertificacao } from "@/lib/formatos";
import type { Recorrencia } from "@/lib/tipos";
import { meusCondominios } from "@/features/organizacoes/api";
import { buscarLista, listarCategorias, publicarLista, salvarLista, type ItemRascunho, type ListaRascunho } from "./api";
import { validarLista } from "./validacao";

const ITEM_VAZIO: ItemRascunho = { categoria_id: "", descricao: "", quantidade: 1, unidade_medida: "un", recorrencia: "unica" };

/* Página de nova lista / edição. */
export default function NovaLista() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const cliente = useQueryClient();
  const conds = useQuery({ queryKey: ["condominios"], queryFn: meusCondominios });
  const cats = useQuery({ queryKey: ["categorias"], queryFn: listarCategorias, staleTime: 3_600_000 });
  const existente = useQuery({ queryKey: ["lista", id], queryFn: () => buscarLista(id!), enabled: !!id });
  const [f, setF] = useState<ListaRascunho>({
    condominio_id: params.get("condominio") ?? "",
    escopo: "condominio",
    titulo: "",
    descricao: "",
    prazo_propostas: dataISO(7),
    data_desejada: "",
    itens: [{ ...ITEM_VAZIO }],
  });
  const [tentou, setTentou] = useState(false);

  useEffect(() => {
    if (!existente.data) return;
    const { lista, itens } = existente.data;
    setF({
      id: lista.id, condominio_id: lista.condominio_id, escopo: lista.escopo, unidade: lista.unidade ?? undefined, titulo: lista.titulo,
      descricao: lista.descricao ?? "", prazo_propostas: lista.prazo_propostas ?? dataISO(7), data_desejada: lista.data_desejada ?? "",
      itens: itens.map((i) => ({ categoria_id: i.categoria_id, descricao: i.descricao, quantidade: Number(i.quantidade), unidade_medida: i.unidade_medida, recorrencia: i.recorrencia })),
    });
  }, [existente.data]);

  const ativos = useMemo(() => conds.data?.filter((c) => c.status === "ativo") ?? [], [conds.data]);
  useEffect(() => {
    if (!f.condominio_id && ativos.length === 1) setF((v) => ({ ...v, condominio_id: ativos[0].id }));
  }, [ativos, f.condominio_id]);

  const meu = ativos.find((c) => c.id === f.condominio_id);
  const gestor = meu?.papel === "sindico" || meu?.papel === "administradora";
  const podePublicar = f.escopo === "unidade" || gestor;
  const erros = validarLista(f, dataISO(0));
  const servicos = cats.data?.filter((c) => c.grupo === "servico") ?? [];
  const produtos = cats.data?.filter((c) => c.grupo === "produto") ?? [];

  const salvar = useMutation({
    mutationFn: async (publicar: boolean) => {
      const listaId = await salvarLista({ ...f, itens: f.itens.map((i) => ({ ...i, descricao: i.descricao.trim() })) });
      const n = publicar ? await publicarLista(listaId) : null;
      return { listaId, n };
    },
    onSuccess: ({ listaId, n }) => {
      cliente.invalidateQueries({ queryKey: ["listas"] });
      cliente.invalidateQueries({ queryKey: ["lista", listaId] });
      if (n !== null) toast.success(n ? `Lista publicada. ${n} fornecedor(es) compatível(is) avisado(s).` : "Lista publicada. Ainda não há fornecedores compatíveis; avisaremos quando houver.");
      else toast.success(!gestor && f.escopo === "condominio" ? "Sugestão enviada ao síndico." : "Rascunho salvo.");
      navegar(`/listas/${listaId}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const enviar = (publicar: boolean) => {
    setTentou(true);
    if (erros.length) return;
    salvar.mutate(publicar);
  };

  const mudarItem = (i: number, campo: keyof ItemRascunho, valor: string | number) =>
    setF((v) => ({ ...v, itens: v.itens.map((it, k) => (k === i ? { ...it, [campo]: valor } : it)) }));

  if (conds.isLoading || cats.isLoading || existente.isLoading) return <Carregando />;
  if (existente.error) return <ErroCarga erro={existente.error} />;

  return (
    <>
      <CabecalhoPagina
        titulo={id ? "Editar lista" : "Nova lista de necessidades"}
        descricao="Descreva cada item com clareza: os fornecedores recebem só bairro e cidade, sem o nome nem o endereço do condomínio."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-lg">Sobre a lista</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Condomínio</Label>
                <Select value={f.condominio_id} disabled={!!id} onValueChange={(v) => setF({ ...f, condominio_id: v })}>
                  <SelectTrigger aria-label="Condomínio"><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>{ativos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <fieldset className="space-y-2 sm:col-span-2" disabled={!!id}>
                <legend className="mb-2 text-sm font-medium">Para quem é</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["condominio", "unidade"] as const).map((e) => (
                    <label key={e} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${f.escopo === e ? "border-primary bg-secondary" : ""}`}>
                      <input type="radio" name="escopo" className="mt-1" checked={f.escopo === e} onChange={() => setF({ ...f, escopo: e })} />
                      <span>
                        <span className="block text-sm font-medium">{e === "condominio" ? "Áreas comuns do condomínio" : "Minha unidade"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {e === "condominio"
                            ? gestor ? "Você publica e escolhe; acima do limite, o conselho aprova." : "Vai como sugestão: o síndico revisa e publica."
                            : `Só você vê e escolhe${meu?.unidade ? ` (${meu.unidade})` : ""}.`}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="l-titulo">Título</Label>
                <Input id="l-titulo" placeholder="Ex.: Manutenção do portão e limpeza da caixa d'água" value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="l-desc">Detalhes (opcional)</Label>
                <Textarea id="l-desc" rows={3} placeholder="Horários de acesso, condições do local, exigências…" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-prazo">Prazo para propostas</Label>
                <Input id="l-prazo" type="date" min={dataISO(0)} value={f.prazo_propostas} onChange={(e) => setF({ ...f, prazo_propostas: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="l-data">Quando precisa (opcional)</Label>
                <Input id="l-data" type="date" min={f.prazo_propostas || dataISO(0)} value={f.data_desejada} onChange={(e) => setF({ ...f, data_desejada: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Itens ({f.itens.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setF({ ...f, itens: [...f.itens, { ...ITEM_VAZIO }] })} disabled={f.itens.length >= 50}>
                <Plus className="mr-1 h-4 w-4" aria-hidden="true" />Item
              </Button>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {f.itens.map((it, i) => {
                  const cat = cats.data?.find((c) => c.id === it.categoria_id);
                  return (
                    <li key={i} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Item {i + 1}</span>
                        {f.itens.length > 1 && (
                          <Button variant="ghost" size="icon" aria-label={`Remover item ${i + 1}`} onClick={() => setF({ ...f, itens: f.itens.filter((_, k) => k !== i) })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-6">
                        <div className="space-y-1 sm:col-span-3">
                          <Label>Categoria</Label>
                          <Select value={it.categoria_id} onValueChange={(v) => mudarItem(i, "categoria_id", v)}>
                            <SelectTrigger aria-label={`Categoria do item ${i + 1}`}><SelectValue placeholder="Escolha" /></SelectTrigger>
                            <SelectContent>
                              <SelectGroup><SelectLabel>Serviços</SelectLabel>{servicos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectGroup>
                              <SelectGroup><SelectLabel>Produtos</SelectLabel>{produtos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectGroup>
                            </SelectContent>
                          </Select>
                          {cat && cat.certificacoes.length > 0 && (
                            <p className="text-xs text-muted-foreground">Exige {cat.certificacoes.map(rotuloCertificacao).join(", ")}: só fornecedores com o documento aprovado recebem.</p>
                          )}
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label>Recorrência</Label>
                          <Select value={it.recorrencia} onValueChange={(v) => mudarItem(i, "recorrencia", v as Recorrencia)}>
                            <SelectTrigger aria-label={`Recorrência do item ${i + 1}`}><SelectValue /></SelectTrigger>
                            <SelectContent>{Object.entries(ROTULO_RECORRENCIA).map(([v, r]) => <SelectItem key={v} value={v}>{r}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 sm:col-span-6">
                          <Label htmlFor={`it-desc-${i}`}>Descrição</Label>
                          <Input id={`it-desc-${i}`} placeholder="Ex.: Revisão do quadro geral de energia" value={it.descricao} onChange={(e) => mudarItem(i, "descricao", e.target.value)} />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label htmlFor={`it-qtd-${i}`}>Quantidade</Label>
                          <Input id={`it-qtd-${i}`} type="number" min={0.01} step="any" value={it.quantidade} onChange={(e) => mudarItem(i, "quantidade", Number(e.target.value))} />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label htmlFor={`it-un-${i}`}>Unidade</Label>
                          <Input id={`it-un-${i}`} placeholder="un, m², mês, visita…" value={it.unidade_medida} onChange={(e) => mudarItem(i, "unidade_medida", e.target.value)} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="space-y-3 p-5">
              {tentou && erros.length > 0 && (
                <ul role="alert" className="list-disc space-y-1 pl-5 text-sm text-destructive">{erros.map((e) => <li key={e}>{e}</li>)}</ul>
              )}
              {podePublicar ? (
                <>
                  <Button className="w-full" onClick={() => enviar(true)} disabled={salvar.isPending}>Salvar e publicar</Button>
                  <Button className="w-full" variant="outline" onClick={() => enviar(false)} disabled={salvar.isPending}>Salvar rascunho</Button>
                </>
              ) : (
                <Button className="w-full" onClick={() => enviar(false)} disabled={salvar.isPending}>Enviar sugestão ao síndico</Button>
              )}
              <p className="text-xs text-muted-foreground">
                Ao publicar, os fornecedores verificados que atendem a região e as categorias recebem a oportunidade e têm até o prazo para enviar propostas.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

/* Fim de NovaLista.tsx */
