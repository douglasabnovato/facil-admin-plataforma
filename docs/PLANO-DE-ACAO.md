# Plano de ação — facil-admin-plataforma

> O estado de cada critério fica só em [`MVP.md`](MVP.md). Este arquivo guarda o plano de cada ciclo. O plano anterior está em [`PLANO-ESTRATEGICO.md`](PLANO-ESTRATEGICO.md).

## Ciclo de 03/11/2026

Executado em 06/11/2026, nas branches `feature/2026-11-06` → `developer/sprint-2026-11-12` → `main`.

### Produto

**Problema e público.** Síndicos e administradoras pedem orçamento por fora, sem comparar propostas do mesmo jeito. Fornecedores gastam tempo achando demanda. A plataforma junta as duas pontas numa lista publicada.

**Hipótese e meta (proposta, sem validação).** Se o condomínio receber ao menos 3 propostas comparáveis numa lista publicada, a escolha sai em menos de 7 dias, sem orçamento por fora.

**O que a pesquisa trouxe.**

| Ideia | Fonte | Uso aqui |
|---|---|---|
| Pedir propostas por escrito a pelo menos 3 prestadores é prática comum, muitas vezes exigida na convenção | [SíndicoNet, coluna de Rodrigo Karpat](https://www.sindiconet.com.br/informese/perfil-do-sindico-colunistas-rodrigo-karpat); [Condomínio SC](https://condominiosc.com.br/jornal-dos-condominios/financas/529-otimize-as-cotacoes-do-condominio) | A demonstração avisa se o mínimo de 3 foi atingido |
| Comparar com critério claro e deixar os orçamentos disponíveis aos condôminos dá transparência | [Condomínio SC](https://condominiosc.com.br/radar/5635-como-saber-se-o-seu-sindico-esta-fazendo-um-bom-trabalho) | Ordenação por aderência, valor ou prazo |
| Projeto gratuito do Supabase pausa após uma semana sem atividade; pode ser retomado pelo painel, com os dados | [Supabase, Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing) | Explica a falha do agendamento e o passo do responsável em #2 |

**Backlog priorizado (impacto × esforço).**

| Item | Impacto | Esforço | Destino |
|---|---|---|---|
| Ordenar propostas e avisar o mínimo de 3 na demonstração | Médio | Baixo | Este ciclo |
| Restaurar o backend | Alto | Baixo (responsável) | #2 |
| Teste do fluxo de necessidades contra o banco do CI | Alto | Médio | Issue nova |
| Reduzir o LCP da `/demonstracao` | Médio | Médio | Issue nova |
| Medição de uso | Médio | Baixo (conta do responsável) | Issue nova |
| Proteger a `main` | Médio | Baixo (responsável) | Issue nova |

**Fora do escopo.** Pagamento na plataforma, nota fiscal, aplicativo móvel e IoT.

### Engenharia

**Arquitetura.** React 18 + TypeScript + Vite no front, publicado na Vercel. Supabase (Postgres com PostGIS, RLS e funções) no backend. Regras do comparativo espelhadas em `src/features/propostas/regras.ts`. A rota `/demonstracao` roda sem backend, com dados fictícios.

**Riscos.** Backend pausado (#2). Agendamento `Manter Supabase ativo` falha toda semana até as Variables existirem. Contas de demonstração são de teste, aceitas pelo responsável.

**Qualidade.** Lint, tipos, Vitest e build no job `front`; migrações e regras num Postgres no job `banco`. Foco visível no seletor novo. LCP medido com Lighthouse móvel.

**Definição de pronto.** CI verde nos jobs `front` e `banco`; teste novo cobrindo a regra; `MVP.md` e README atualizados.

### Plano de ação

**Executado neste ciclo.**

- Ordenação das propostas na demonstração (aderência, valor, prazo), com função pura e teste de ordem invertida.
- Aviso do mínimo de 3 propostas por escrito.
- Este plano, a revisão do `MVP.md` e a seção de estado no README.

**Vira issue.** Ver a seção "Estado e próximos passos" do [README](../README.md).

**Nota sobre o CI.** Na `main`, só o agendamento `Manter Supabase ativo` falha, porque o projeto do Supabase está pausado e as Variables estão vazias (#2). Os jobs `front` e `banco` do workflow `CI` passam.
