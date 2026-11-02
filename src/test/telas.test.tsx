/*
 * telas.test.tsx — renderização das telas públicas e de componentes comuns.
 */
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContexto, type AuthValor } from "@/features/auth/contexto";
import Cadastro from "@/features/auth/Cadastro";
import Entrar from "@/features/auth/Entrar";
import { Score, SeloStatus } from "@/components/Comuns";
import Demonstracao from "@/features/demonstracao/Demonstracao";
import { mensagemAuth } from "@/features/auth/mensagens";

const semLogin: AuthValor = { sessao: null, usuario: null, perfil: null, carregando: false, recarregarPerfil: async () => {}, sair: async () => {} };

/* Renderiza com rota e contexto de autenticação. */
function montar(el: JSX.Element, rota = "/") {
  return render(
    <AuthContexto.Provider value={semLogin}>
      <MemoryRouter initialEntries={[rota]}>{el}</MemoryRouter>
    </AuthContexto.Provider>,
  );
}

describe("telas públicas", () => {
  it("login tem e-mail, senha e link de cadastro", () => {
    montar(<Entrar />);
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cadastre-se" })).toBeInTheDocument();
  });
  it("cadastro abre com o tipo vindo da URL", () => {
    montar(<Cadastro />, "/cadastro?tipo=fornecedor");
    expect(screen.getByRole("radio", { name: /Fornecedor/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Síndico/ })).toHaveAttribute("aria-checked", "false");
  });
});

describe("demonstração sem backend", () => {
  it("avisa que os dados são fictícios", () => {
    montar(<Demonstracao />);
    expect(screen.getByRole("note")).toHaveTextContent("dados fictícios");
  });
  it("aplica a regra de aprovação conforme o valor escolhido", () => {
    montar(<Demonstracao />);
    fireEvent.click(screen.getByRole("button", { name: "Escolher Fornecedor A" }));
    expect(screen.getByText(/a síndica aprova sem votação/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Escolher Fornecedor C" }));
    expect(screen.getByText(/o conselho vota antes da contratação/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Escolher Fornecedor C" })).toHaveAttribute("aria-pressed", "true");
  });
  it("traduz a falha de rede no login", () => {
    expect(mensagemAuth("Failed to fetch")).toMatch(/veja a demonstração/);
  });
});

describe("componentes", () => {
  it("selo traduz o status", () => {
    render(<SeloStatus tipo="contratacao" status="aguardando_aprovacao" />);
    expect(screen.getByText("Aguardando conselho")).toBeInTheDocument();
  });
  it("score tem rótulo acessível", () => {
    render(<Score valor={82} />);
    expect(screen.getByLabelText("Compatibilidade 82 de 100")).toBeInTheDocument();
  });
});

/* Fim de telas.test.tsx */
