/*
 * listas.test.tsx — tela logada de necessidades com a API simulada: carregamento, erro com
 * nova tentativa, falha ao carregar os condomínios, estado vazio e lista com propostas.
 * Não depende do Supabase publicado (#2).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MeuCondominio, ResumoLista } from "@/lib/tipos";

const api = vi.hoisted(() => ({ minhasListas: vi.fn(), meusCondominios: vi.fn() }));
vi.mock("@/features/necessidades/api", () => ({ minhasListas: api.minhasListas }));
vi.mock("@/features/organizacoes/api", () => ({ meusCondominios: api.meusCondominios }));

import Listas from "@/features/necessidades/Listas";

const condominio = { id: "c1", nome: "Residencial Ipês", status: "ativo" } as MeuCondominio;
const lista: ResumoLista = {
  id: "l1", condominio_id: "c1", condominio: "Residencial Ipês", titulo: "Manutenção elétrica", escopo: "condominio",
  unidade: null, status: "aberta", prazo_propostas: "2026-12-01", itens: 2, propostas: 1, min_propostas: 3,
  eh_autor: true, created_at: "2026-11-01",
};

/* Monta a tela com um QueryClient novo, sem novas tentativas automáticas. */
function montar() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={["/listas"]}>
        <Listas />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.minhasListas.mockReset();
  api.meusCondominios.mockReset();
});

describe("tela de necessidades", () => {
  it("mostra o carregamento enquanto a API não responde", () => {
    api.minhasListas.mockReturnValue(new Promise(() => {}));
    api.meusCondominios.mockReturnValue(new Promise(() => {}));
    montar();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  });

  it("mostra o erro das listas e tenta de novo", async () => {
    api.meusCondominios.mockResolvedValue([condominio]);
    api.minhasListas.mockRejectedValueOnce(new Error("Falha de rede")).mockResolvedValue([lista]);
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Manutenção elétrica")).toBeInTheDocument();
    expect(api.minhasListas).toHaveBeenCalledTimes(2);
  });

  it("avisa a falha dos condomínios em vez de pedir para entrar em um", async () => {
    api.meusCondominios.mockRejectedValue(new Error("Sem conexão com o servidor"));
    api.minhasListas.mockResolvedValue([]);
    montar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
    expect(screen.queryByText("Entre em um condomínio primeiro.")).not.toBeInTheDocument();
  });

  it("pede para entrar em um condomínio quando não há nenhum ativo", async () => {
    api.meusCondominios.mockResolvedValue([]);
    api.minhasListas.mockResolvedValue([]);
    montar();
    expect(await screen.findByText("Entre em um condomínio primeiro.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para condomínios" })).toHaveAttribute("href", "/condominios");
  });

  it("mostra estado vazio por filtro e a lista com o andamento das propostas", async () => {
    api.meusCondominios.mockResolvedValue([condominio]);
    api.minhasListas.mockResolvedValue([lista]);
    montar();
    expect(await screen.findByText("Manutenção elétrica")).toBeInTheDocument();
    expect(screen.getByText(/1 de 3 propostas/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nova lista/ })).toHaveAttribute("href", "/listas/nova");
    fireEvent.click(screen.getByRole("tab", { name: "Contratadas" }));
    expect(screen.getByRole("tab", { name: "Contratadas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Nenhuma lista aqui.")).toBeInTheDocument();
  });
});

/* Fim de listas.test.tsx */
