# Plano de ação — facil-admin-plataforma

> O estado de cada critério fica só em [`MVP.md`](MVP.md). Este arquivo guarda o plano de cada ciclo. O plano anterior está em [`PLANO-ESTRATEGICO.md`](PLANO-ESTRATEGICO.md).

## Ciclo de 07/11/2026

Executado em 09/11/2026, nas branches `feature/2026-11-07` → `developer/sprint-2026-11-12` → `main` (o merge na `main` fica com o responsável). Nível: Produto (N3), 12 critérios. Escopo: critérios 6, 8, 11 e 12, no que não depende do Supabase pausado (#2).

### Produto
- **Problema e público:** síndicos e fornecedores precisam saber o que aconteceu quando a tela logada não carrega. Hoje o backend está pausado, e a tela de necessidades mandava "entrar em um condomínio" quando a consulta dos condomínios falhava.
- **Hipótese e meta:** com erro claro e "Tentar de novo", quem encontra uma falha de rede tenta de novo em vez de abandonar. Meta técnica: toda falha das duas consultas da tela de necessidades vira mensagem com nova tentativa, com teste.
- **O que a pesquisa trouxe:**
  - O TanStack Query tenta 3 vezes antes de marcar erro, e `refetch` serve para o botão de nova tentativa; com várias consultas na tela, o estado de erro de cada uma precisa decidir a interface ([TanStack Query, novas tentativas](https://tanstack.com/query/latest/docs/framework/react/guides/query-retries)).
  - Comandos de workflow (`::warning`) criam avisos visíveis no resumo do run sem falhar o job, o que deixa a ausência de configuração à vista sem um vermelho permanente ([GitHub, comandos de workflow](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)).
- **Backlog (impacto × esforço):**
  1. Tratar a falha dos condomínios na tela de necessidades, com testes da tela logada (alto × baixo). Este ciclo.
  2. Agendamento do Supabase com aviso sem Variables (#19) (médio × baixo). Este ciclo.
  3. Registrar o cenário do banco como evidência do critério 11 (#15) (médio × baixo). Este ciclo.
  4. Mesmo tratamento nas demais telas logadas e teste do axe (médio × médio). Issue.
  5. Restaurar o backend (#2), medir uso (#17), proteger a `main` (#18). Responsável.
- **Fora do escopo:** mexer no Supabase, Vercel, segredos ou nas contas de demonstração.

### Engenharia
- **Arquitetura:** React 18 + TanStack Query no front; Supabase (Postgres, RLS e funções) no back. As telas chamam `rpc()`; o erro do banco vira `Error` com a mensagem. `ErroCarga` e `EstadoVazio` em `src/components/Comuns.tsx` são as respostas padrão.
- **Riscos:** testes com a API simulada não pegam erro do banco real; isso fica com o cenário `supabase/tests/cenario.py`, que roda no job `banco`.
- **Qualidade:** `src/test/listas.test.tsx` (5 testes) cobre carregamento, erro com nova tentativa, falha dos condomínios, vazio e lista; lint, tipos, testes e build no job `front`.
- **Definição de pronto:** CI verde, PR para a sprint mesclado e PR para a `main` aberto com `revisao-responsavel`.

### Plano de ação
- **Executa:** correção da tela de necessidades com testes; aviso no agendamento (#19); `MVP.md` com uma tabela só; README.
- **Vira issue:** erro e vazio nas demais telas logadas, com teste; axe nas telas logadas; as do responsável seguem (#2, #17, #18).

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
