/*
 * acessibilidade.test.tsx — axe e teclado nas telas logadas, montadas dentro do Layout com a API simulada.
 * O jsdom não calcula cores: o contraste fica de fora aqui (regra color-contrast desligada) e é
 * conferido no navegador. Não depende do Supabase publicado (#2).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { Route, Routes } from "react-router-dom";
import type { Perfil } from "@/lib/tipos";
import {
  condominio, contratacao, fornecedor, lista, montar, notificacao, oportunidade, painel, perfilFornecedor, perfilGestor, proposta,
} from "./apoio";

const api = vi.hoisted(() => ({
  rpc: vi.fn(),
  naoLidas: vi.fn(),
  meusCondominios: vi.fn(),
  minhasAdministradoras: vi.fn(),
  minhasListas: vi.fn(),
  meuFornecedor: vi.fn(),
  oportunidades: vi.fn(),
  minhasPropostas: vi.fn(),
  minhasContratacoes: vi.fn(),
  listarNotificacoes: vi.fn(),
  marcarLidas: vi.fn(),
}));

/* Cliente falso só para a contagem de não lidas do Layout. */
vi.mock("@/lib/supabase", async (original) => ({
  ...(await original<object>()),
  rpc: api.rpc,
  supabase: { from: () => ({ select: () => ({ eq: api.naoLidas }) }) },
}));
vi.mock("@/features/organizacoes/api", async (original) => ({
  ...(await original<object>()), meusCondominios: api.meusCondominios, minhasAdministradoras: api.minhasAdministradoras,
}));
vi.mock("@/features/necessidades/api", async (original) => ({ ...(await original<object>()), minhasListas: api.minhasListas }));
vi.mock("@/features/fornecedores/api", async (original) => ({ ...(await original<object>()), meuFornecedor: api.meuFornecedor }));
vi.mock("@/features/matching/api", async (original) => ({ ...(await original<object>()), oportunidades: api.oportunidades }));
vi.mock("@/features/propostas/api", async (original) => ({ ...(await original<object>()), minhasPropostas: api.minhasPropostas }));
vi.mock("@/features/contratacoes/api", async (original) => ({ ...(await original<object>()), minhasContratacoes: api.minhasContratacoes }));
vi.mock("@/features/notificacoes/api", () => ({ listarNotificacoes: api.listarNotificacoes, marcarLidas: api.marcarLidas }));

import Layout from "@/app/Layout";
import Painel from "@/features/painel/Painel";
import Condominios from "@/features/organizacoes/Condominios";
import Listas from "@/features/necessidades/Listas";
import Oportunidades from "@/features/matching/Oportunidades";
import MinhasPropostas from "@/features/propostas/MinhasPropostas";
import Contratacoes from "@/features/contratacoes/Contratacoes";
import Notificacoes from "@/features/notificacoes/Notificacoes";

/* Monta a rota dentro do Layout, como no app. */
function montarLogada(rota: string, perfil: Perfil = perfilGestor) {
  return montar(
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Painel />} />
        <Route path="condominios" element={<Condominios />} />
        <Route path="listas" element={<Listas />} />
        <Route path="listas/:id" element={<p>Detalhe da lista</p>} />
        <Route path="oportunidades" element={<Oportunidades />} />
        <Route path="propostas" element={<MinhasPropostas />} />
        <Route path="contratacoes" element={<Contratacoes />} />
        <Route path="notificacoes" element={<Notificacoes />} />
      </Route>
    </Routes>,
    { rota, perfil },
  );
}

/* Roda o axe (WCAG 2.1 A e AA e boas práticas) e devolve as violações em texto legível. */
async function violacoes(alvo: Element = document.body) {
  const r = await axe.run(alvo, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

/* O axe é lento no jsdom; e o jsdom não tem canvas (o axe tenta usar para ícones). */
vi.setConfig({ testTimeout: 30_000 });
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement["getContext"];

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
  api.naoLidas.mockResolvedValue({ count: 3, error: null });
  api.rpc.mockResolvedValue(painel);
  api.meusCondominios.mockResolvedValue([condominio, { ...condominio, id: "c2", nome: "Edifício Aroeira", status: "pendente" }]);
  api.minhasAdministradoras.mockResolvedValue([{ id: "a1", nome: "Adm Central" }]);
  api.minhasListas.mockResolvedValue([lista, { ...lista, id: "l2", titulo: "Limpeza da caixa d'água", status: "contratada" }]);
  api.meuFornecedor.mockResolvedValue({ fornecedor, categorias: [] });
  api.oportunidades.mockResolvedValue([oportunidade, { ...oportunidade, lista_id: "l3", titulo: "Pintura da fachada", minha_proposta: "enviada" }]);
  api.minhasPropostas.mockResolvedValue([proposta]);
  api.minhasContratacoes.mockResolvedValue([contratacao, { ...contratacao, id: "k2", status: "concluida", pode_votar: false }]);
  api.listarNotificacoes.mockResolvedValue([notificacao, { ...notificacao, id: "n2", lida: true, titulo: "Contratação aprovada" }]);
  api.marcarLidas.mockResolvedValue(undefined);
});

describe("axe nas telas logadas, com dados", () => {
  const telas: Array<[string, string, Perfil, string]> = [
    ["painel do gestor", "/", perfilGestor, "Aprovações esperando o seu voto"],
    ["painel do fornecedor", "/", perfilFornecedor, "Complete o seu cadastro de fornecedor"],
    ["condomínios", "/condominios", perfilGestor, "Edifício Aroeira"],
    ["necessidades", "/listas", perfilGestor, "Manutenção elétrica"],
    ["oportunidades", "/oportunidades", perfilFornecedor, "Pintura da fachada"],
    ["minhas propostas", "/propostas", perfilFornecedor, "Manutenção elétrica"],
    ["contratações", "/contratacoes", perfilGestor, "Seu voto"],
    ["notificações", "/notificacoes", perfilGestor, "Contratação aprovada"],
  ];
  it.each(telas)("%s sem violações", async (_nome, rota, perfil, texto) => {
    montarLogada(rota, perfil);
    expect(await screen.findByText(texto)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("link", { name: "Notificações, 3 não lidas" })).toBeInTheDocument());
    expect(await violacoes()).toEqual([]);
  });
});

describe("axe nos estados de erro e vazio", () => {
  it("erro de carga sem violações", async () => {
    api.minhasContratacoes.mockRejectedValue(new Error("Falha de rede"));
    montarLogada("/contratacoes");
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    expect(await violacoes()).toEqual([]);
  });

  it("estado vazio sem violações", async () => {
    api.minhasListas.mockResolvedValue([]);
    montarLogada("/listas");
    expect(await screen.findByText("Nenhuma lista aqui.")).toBeInTheDocument();
    expect(await violacoes()).toEqual([]);
  });

  it("diálogo de cadastro de condomínio, com administradora, sem violações", async () => {
    const usuario = userEvent.setup();
    montarLogada("/condominios");
    await usuario.click(await screen.findByRole("button", { name: /Cadastrar condomínio/ }));
    const dialogo = await screen.findByRole("dialog", { name: "Cadastrar condomínio" });
    await usuario.click(within(dialogo).getByRole("checkbox"));
    expect(within(dialogo).getByRole("combobox", { name: "Administradora" })).toBeInTheDocument();
    expect(await violacoes(dialogo)).toEqual([]);
  });
});

describe("teclado nas telas logadas", () => {
  it("a primeira parada é o atalho para o conteúdo, seguida do menu e das ações", async () => {
    const usuario = userEvent.setup();
    montarLogada("/listas");
    await screen.findByText("Manutenção elétrica");
    await usuario.tab();
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Pular para o conteúdo" })).toHaveAttribute("href", "#conteudo");
    expect(document.getElementById("conteudo")?.tagName).toBe("MAIN");
    const ordem: string[] = [];
    for (let i = 0; i < 9; i++) {
      await usuario.tab();
      ordem.push((document.activeElement as HTMLElement).getAttribute("aria-label") ?? document.activeElement?.textContent ?? "");
    }
    expect(ordem).toEqual([
      "Abrir menu", "FacilAdmin, painel", "Painel", "Condomínios", "Necessidades", "Contratações",
      "Notificações, 3 não lidas", "Conta", "Nova lista",
    ]);
  });

  it("filtro de situação das necessidades funciona com Enter e espaço", async () => {
    const usuario = userEvent.setup();
    montarLogada("/listas");
    await screen.findByText("Manutenção elétrica");
    screen.getByRole("tab", { name: "Contratadas" }).focus();
    await usuario.keyboard("{Enter}");
    expect(screen.getByRole("tab", { name: "Contratadas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Limpeza da caixa d'água")).toBeInTheDocument();
    screen.getByRole("tab", { name: "Todas" }).focus();
    await usuario.keyboard(" ");
    expect(screen.getByRole("tab", { name: "Todas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Manutenção elétrica")).toBeInTheDocument();
  });

  it("diálogo do código abre pelo teclado, prende o foco e devolve ao fechar com Esc", async () => {
    const usuario = userEvent.setup();
    montarLogada("/condominios");
    const botao = await screen.findByRole("button", { name: /Tenho um código/ });
    botao.focus();
    await usuario.keyboard("{Enter}");
    const dialogo = await screen.findByRole("dialog", { name: "Entrar em um condomínio" });
    await waitFor(() => expect(dialogo.contains(document.activeElement)).toBe(true));
    for (let i = 0; i < 6; i++) {
      await usuario.tab();
      expect(dialogo.contains(document.activeElement)).toBe(true);
    }
    await usuario.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(botao).toHaveFocus();
  });

  it("notificação abre com Enter e é marcada como lida", async () => {
    const usuario = userEvent.setup();
    montarLogada("/notificacoes");
    const item = await screen.findByRole("button", { name: /Nova proposta em Manutenção elétrica/ });
    item.focus();
    await usuario.keyboard("{Enter}");
    expect(await screen.findByText("Detalhe da lista")).toBeInTheDocument();
    expect(api.marcarLidas).toHaveBeenCalledWith("n1", expect.anything());
  });

  it("erro de carga: o botão de nova tentativa é alcançado e acionado pelo teclado", async () => {
    const usuario = userEvent.setup();
    api.minhasPropostas.mockRejectedValueOnce(new Error("Falha de rede")).mockResolvedValue([proposta]);
    montarLogada("/propostas", perfilFornecedor);
    const botao = await screen.findByRole("button", { name: "Tentar de novo" });
    botao.focus();
    await usuario.keyboard("{Enter}");
    expect(await screen.findByText("Manutenção elétrica")).toBeInTheDocument();
  });
});

/* Fim de acessibilidade.test.tsx */
