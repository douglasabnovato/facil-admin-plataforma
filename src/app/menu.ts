/*
 * menu.ts — itens de navegação conforme o tipo de conta (fornecedor ou contratante) e o perfil admin.
 */

export interface ItemMenu {
  para: string;
  rotulo: string;
}

/* Itens do menu conforme o tipo de conta. */
export function itensMenu(tipo: string | undefined, admin: boolean): ItemMenu[] {
  const itens: ItemMenu[] =
    tipo === "fornecedor"
      ? [
          { para: "/", rotulo: "Painel" },
          { para: "/oportunidades", rotulo: "Oportunidades" },
          { para: "/propostas", rotulo: "Propostas" },
          { para: "/contratacoes", rotulo: "Contratações" },
          { para: "/fornecedor", rotulo: "Meu cadastro" },
        ]
      : [
          { para: "/", rotulo: "Painel" },
          { para: "/condominios", rotulo: "Condomínios" },
          { para: "/listas", rotulo: "Necessidades" },
          { para: "/contratacoes", rotulo: "Contratações" },
        ];
  if (admin) itens.push({ para: "/admin", rotulo: "Admin" });
  return itens;
}

/* Fim de menu.ts */
