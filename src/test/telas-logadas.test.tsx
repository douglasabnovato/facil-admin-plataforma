/*
 * telas-logadas.test.tsx — carregamento, erro com nova tentativa, vazio e dados nas telas logadas
 * (painel, condomínios, oportunidades, propostas, contratações e notificações) e a falha das consultas
 * secundárias em nova lista, cadastro do fornecedor e administração, com a API simulada.
 * Não depende do Supabase publicado (#2). A tela de necessidades está em listas.test.tsx.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import {
  condominio, contratacao, fornecedor, montar, notificacao, oportunidade, painel, pendente, perfilFornecedor, proposta,
} from "./apoio";

const api = vi.hoisted(() => ({
  rpc: vi.fn(),
  meusCondominios: vi.fn(),
  meuFornecedor: vi.fn(),
  oportunidades: vi.fn(),
  ignorarOportunidade: vi.fn(),
  minhasPropostas: vi.fn(),
  minhasContratacoes: vi.fn(),
  listarNotificacoes: vi.fn(),
  marcarLidas: vi.fn(),
  toastErro: vi.fn(),
  listarCategorias: vi.fn(),
  meusDocumentos: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase", async (original) => ({ ...(await original<object>()), rpc: api.rpc, supabase: { from: api.from } }));
vi.mock("@/features/necessidades/api", async (original) => ({ ...(await original<object>()), listarCategorias: api.listarCategorias }));
vi.mock("@/features/organizacoes/api", async (original) => ({ ...(await original<object>()), meusCondominios: api.meusCondominios }));
vi.mock("@/features/fornecedores/api", async (original) => ({
  ...(await original<object>()), meuFornecedor: api.meuFornecedor, meusDocumentos: api.meusDocumentos,
}));
vi.mock("@/features/matching/api", async (original) => ({
  ...(await original<object>()), oportunidades: api.oportunidades, ignorarOportunidade: api.ignorarOportunidade,
}));
vi.mock("@/features/propostas/api", async (original) => ({ ...(await original<object>()), minhasPropostas: api.minhasPropostas }));
vi.mock("@/features/contratacoes/api", async (original) => ({ ...(await original<object>()), minhasContratacoes: api.minhasContratacoes }));
vi.mock("@/features/notificacoes/api", () => ({ listarNotificacoes: api.listarNotificacoes, marcarLidas: api.marcarLidas }));
vi.mock("sonner", async (original) => {
  const real = await original<typeof import("sonner")>();
  return { ...real, toast: Object.assign(vi.fn(), real.toast, { error: api.toastErro, success: vi.fn() }) };
});

import Painel from "@/features/painel/Painel";
import Condominios from "@/features/organizacoes/Condominios";
import Oportunidades from "@/features/matching/Oportunidades";
import MinhasPropostas from "@/features/propostas/MinhasPropostas";
import Contratacoes from "@/features/contratacoes/Contratacoes";
import Notificacoes from "@/features/notificacoes/Notificacoes";
import NovaLista from "@/features/necessidades/NovaLista";
import PerfilFornecedor from "@/features/fornecedores/PerfilFornecedor";
import Admin from "@/features/admin/Admin";

beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
});

/* Clica em "Tentar de novo" e espera o texto que a tela mostra depois. */
async function tentarDeNovo(esperado: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
  expect(await screen.findByText(esperado)).toBeInTheDocument();
}

describe("painel", () => {
  it("mostra o carregamento", () => {
    api.rpc.mockReturnValue(pendente());
    montar(<Painel />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  });

  it("mostra o erro e tenta de novo", async () => {
    api.rpc.mockRejectedValueOnce(new Error("Falha de rede")).mockResolvedValue(painel);
    montar(<Painel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    await tentarDeNovo("Aprovações esperando o seu voto");
    expect(api.rpc).toHaveBeenCalledWith("painel");
  });

  it("pede o condomínio quando o gestor ainda não tem nenhum", async () => {
    api.rpc.mockResolvedValue({ ...painel, contratante: { ...painel.contratante, condominios: 0, listas_abertas: 0 } });
    montar(<Painel />);
    expect(await screen.findByText("Comece pelo condomínio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Condomínios/ })).toHaveAttribute("href", "/condominios");
  });

  it("pede o cadastro quando o fornecedor ainda não tem perfil", async () => {
    api.rpc.mockResolvedValue(painel);
    montar(<Painel />, { perfil: perfilFornecedor });
    expect(await screen.findByText("Complete o seu cadastro de fornecedor")).toBeInTheDocument();
    expect(screen.queryByText("Aprovações esperando o seu voto")).not.toBeInTheDocument();
  });
});

describe("condomínios", () => {
  it("mostra o carregamento", () => {
    api.meusCondominios.mockReturnValue(pendente());
    montar(<Condominios />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  });

  it("mostra o erro e tenta de novo", async () => {
    api.meusCondominios.mockRejectedValueOnce(new Error("Sem conexão com o servidor")).mockResolvedValue([condominio]);
    montar(<Condominios />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
    await tentarDeNovo("Residencial Ipês");
    expect(api.meusCondominios).toHaveBeenCalledTimes(2);
  });

  it("mostra o estado vazio com as duas formas de entrar", async () => {
    api.meusCondominios.mockResolvedValue([]);
    montar(<Condominios />);
    expect(await screen.findByText("Você ainda não participa de nenhum condomínio.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tenho um código/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cadastrar condomínio/ })).toBeInTheDocument();
  });
});

describe("oportunidades", () => {
  it("mostra o carregamento", () => {
    api.meuFornecedor.mockReturnValue(pendente());
    montar(<Oportunidades />, { perfil: perfilFornecedor });
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  });

  it("tenta de novo a consulta do cadastro quando é ela que falha", async () => {
    api.meuFornecedor.mockRejectedValueOnce(new Error("Falha ao ler o cadastro")).mockResolvedValue({ fornecedor, categorias: [] });
    api.oportunidades.mockResolvedValue([oportunidade]);
    montar(<Oportunidades />, { perfil: perfilFornecedor });
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao ler o cadastro");
    await tentarDeNovo("Manutenção elétrica");
    expect(api.meuFornecedor).toHaveBeenCalledTimes(2);
  });

  it("mostra o erro das oportunidades e tenta de novo", async () => {
    api.meuFornecedor.mockResolvedValue({ fornecedor, categorias: [] });
    api.oportunidades.mockRejectedValueOnce(new Error("Falha de rede")).mockResolvedValue([oportunidade]);
    montar(<Oportunidades />, { perfil: perfilFornecedor });
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    await tentarDeNovo("Manutenção elétrica");
    expect(api.oportunidades).toHaveBeenCalledTimes(2);
  });

  it("pede o cadastro quando não há fornecedor e não busca oportunidades", async () => {
    api.meuFornecedor.mockResolvedValue({ fornecedor: null, categorias: [] });
    montar(<Oportunidades />, { perfil: perfilFornecedor });
    expect(await screen.findByText("Complete o seu cadastro de fornecedor.")).toBeInTheDocument();
    expect(api.oportunidades).not.toHaveBeenCalled();
  });

  it("avisa a verificação pendente", async () => {
    api.meuFornecedor.mockResolvedValue({ fornecedor: { ...fornecedor, verificado: false }, categorias: [] });
    api.oportunidades.mockResolvedValue([]);
    montar(<Oportunidades />, { perfil: perfilFornecedor });
    expect(await screen.findByText("Seu cadastro está em verificação.")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando não há oportunidade aberta", async () => {
    api.meuFornecedor.mockResolvedValue({ fornecedor, categorias: [] });
    api.oportunidades.mockResolvedValue([]);
    montar(<Oportunidades />, { perfil: perfilFornecedor });
    expect(await screen.findByText("Nenhuma oportunidade aberta no momento.")).toBeInTheDocument();
  });

  it("avisa quando não consegue esconder uma oportunidade", async () => {
    api.meuFornecedor.mockResolvedValue({ fornecedor, categorias: [] });
    api.oportunidades.mockResolvedValue([oportunidade]);
    api.ignorarOportunidade.mockRejectedValue(new Error("Sem permissão"));
    montar(<Oportunidades />, { perfil: perfilFornecedor });
    fireEvent.click(await screen.findByRole("button", { name: "Esconder Manutenção elétrica" }));
    await waitFor(() => expect(api.toastErro).toHaveBeenCalledWith("Não foi possível esconder: Sem permissão"));
  });
});

describe("minhas propostas", () => {
  it("mostra o carregamento", () => {
    api.minhasPropostas.mockReturnValue(pendente());
    montar(<MinhasPropostas />, { perfil: perfilFornecedor });
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  });

  it("mostra o erro e tenta de novo", async () => {
    api.minhasPropostas.mockRejectedValueOnce(new Error("Falha de rede")).mockResolvedValue([proposta]);
    montar(<MinhasPropostas />, { perfil: perfilFornecedor });
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    await tentarDeNovo("Manutenção elétrica");
    expect(screen.getByRole("link", { name: /aguardando conselho/ })).toHaveAttribute("href", "/contratacoes/k1");
  });

  it("mostra o estado vazio com o caminho para as oportunidades", async () => {
    api.minhasPropostas.mockResolvedValue([]);
    montar(<MinhasPropostas />, { perfil: perfilFornecedor });
    expect(await screen.findByText("Você ainda não enviou propostas.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver oportunidades" })).toHaveAttribute("href", "/oportunidades");
  });
});

describe("contratações", () => {
  it("mostra o carregamento", () => {
    api.minhasContratacoes.mockReturnValue(pendente());
    montar(<Contratacoes />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  });

  it("mostra o erro e tenta de novo", async () => {
    api.minhasContratacoes.mockRejectedValueOnce(new Error("Falha de rede")).mockResolvedValue([contratacao]);
    montar(<Contratacoes />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    await tentarDeNovo("Manutenção elétrica");
    expect(screen.getByText("Seu voto")).toBeInTheDocument();
  });

  it("mostra o estado vazio", async () => {
    api.minhasContratacoes.mockResolvedValue([]);
    montar(<Contratacoes />);
    expect(await screen.findByText("Nenhuma contratação ainda.")).toBeInTheDocument();
  });
});

describe("notificações", () => {
  it("mostra o carregamento", () => {
    api.listarNotificacoes.mockReturnValue(pendente());
    montar(<Notificacoes />);
    expect(screen.getByRole("status")).toHaveTextContent("Carregando");
  });

  it("mostra o erro e tenta de novo", async () => {
    api.listarNotificacoes.mockRejectedValueOnce(new Error("Falha de rede")).mockResolvedValue([notificacao]);
    montar(<Notificacoes />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha de rede");
    await tentarDeNovo("Nova proposta em Manutenção elétrica");
    expect(screen.getByText("não lida")).toBeInTheDocument();
  });

  it("mostra o estado vazio sem o botão de marcar todas", async () => {
    api.listarNotificacoes.mockResolvedValue([]);
    montar(<Notificacoes />);
    expect(await screen.findByText("Nenhuma notificação.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Marcar todas/ })).not.toBeInTheDocument();
  });

  it("avisa quando não consegue marcar como lidas", async () => {
    api.listarNotificacoes.mockResolvedValue([notificacao]);
    api.marcarLidas.mockRejectedValue(new Error("Sem conexão"));
    montar(<Notificacoes />);
    fireEvent.click(await screen.findByRole("button", { name: /Marcar todas como lidas/ }));
    await waitFor(() => expect(api.toastErro).toHaveBeenCalledWith("Não foi possível marcar como lida: Sem conexão"));
  });
});

/* Consulta do Supabase que sempre falha, com a cadeia select/order/eq. */
function consultaComFalha(mensagem: string) {
  const resposta = { data: null, error: { message: mensagem } };
  const cadeia: Record<string, unknown> = {};
  for (const m of ["select", "order", "eq"]) cadeia[m] = () => cadeia;
  cadeia.then = (ok: (r: typeof resposta) => unknown) => Promise.resolve(resposta).then(ok);
  return cadeia;
}

describe("consultas secundárias", () => {
  it("nova lista: falha dos condomínios vira erro com nova tentativa, não um formulário vazio", async () => {
    api.meusCondominios.mockRejectedValueOnce(new Error("Sem conexão com o servidor")).mockResolvedValue([condominio]);
    api.listarCategorias.mockResolvedValue([]);
    montar(<NovaLista />, { rota: "/listas/nova" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem conexão com o servidor");
    await tentarDeNovo("Nova lista de necessidades");
  });

  it("nova lista: falha das categorias vira erro com nova tentativa", async () => {
    api.meusCondominios.mockResolvedValue([condominio]);
    api.listarCategorias.mockRejectedValueOnce(new Error("Falha nas categorias")).mockResolvedValue([]);
    montar(<NovaLista />, { rota: "/listas/nova" });
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha nas categorias");
    await tentarDeNovo("Nova lista de necessidades");
  });

  it("cadastro do fornecedor: falha das categorias e dos documentos aparece", async () => {
    api.meuFornecedor.mockResolvedValue({ fornecedor, categorias: [] });
    api.meusDocumentos.mockRejectedValue(new Error("Falha nos documentos"));
    api.listarCategorias.mockRejectedValueOnce(new Error("Falha nas categorias")).mockResolvedValue([]);
    montar(<PerfilFornecedor />, { perfil: perfilFornecedor });
    expect(await screen.findByText("Falha nas categorias")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Falha nos documentos")).toBeInTheDocument();
    expect(screen.queryByText("Falha nas categorias")).not.toBeInTheDocument();
  });

  it("administração: falha ao carregar fornecedores e documentos vira erro, não uma fila vazia", async () => {
    api.from.mockImplementation(() => consultaComFalha("Sem permissão de administrador"));
    montar(<Admin />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Sem permissão de administrador");
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});

/* Fim de telas-logadas.test.tsx */
