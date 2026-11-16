# Plano de ação — facil-admin-plataforma

> O estado de cada critério fica só em [`MVP.md`](MVP.md). Este arquivo guarda o plano de cada ciclo. O plano anterior está em [`PLANO-ESTRATEGICO.md`](PLANO-ESTRATEGICO.md).

## Ciclo de 16/11/2026, parte 2: LCP da `/demonstracao` (#36)

Executado em 16/11/2026, nas branches `feature/2026-11-16-lcp` → `developer/sprint-2026-11-19` (o PR #40 → `main` segue aberto). Nível: Produto (N3).

### Produto
- **Problema:** no site, a mediana do LCP da `/demonstracao` foi 2,79 s (meta: 2,5 s). Quem chega pelo celular vê só "Carregando…" até o título aparecer.
- **Hipótese e meta:** se o `h1` pintar com o JS que o `index.html` já pede, a mediana local fica bem abaixo de 2,5 s; saberemos quando o Lighthouse móvel no site, depois do merge do #40, der mediana até 2,5 s em 3 execuções.
- **O que a pesquisa trouxe:**
  - O LCP se divide em TTFB, atraso de carga, tempo de carga e atraso de renderização; quando o elemento é texto, o atraso de renderização vem do JS que precisa rodar antes de ele existir ([web.dev, Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp)). O JSON do Lighthouse mostrou exatamente isso: o `h1` é o elemento do LCP, e o atraso é de renderização.
  - O `React.lazy` só pede o código do componente na primeira vez que ele vai ser renderizado ([React, `lazy`](https://react.dev/reference/react/lazy)). Para a página de entrada, isso cria uma cascata: HTML → JS principal → chunk da página.
  - O Vite gera `modulepreload` só para os chunks importados de forma estática pela entrada ([Vite, Features: preload directives](https://vite.dev/guide/features#preload-directives-generation)). Um chunk de `import()` não entra no `index.html`.
- **Decisão:** importar a `Demonstracao` sem `lazy`. Ela tem ~5 kB (1,8 kB gzip), só dados fictícios e não importa o Supabase. O `modulepreload` do chunk serviria também, mas o `index.html` é o mesmo para todas as rotas, e o login e o painel baixariam a página à toa.
- **Segunda causa, achada na medição:** com a página no bundle de entrada, a primeira pintura passou a vir depois do `load`. O import do `supabase-js`, que esperava só o `load` e o navegador ocioso, começava antes dela, e o Lighthouse 12.8.2 o contava no LCP simulado (mediana ficou em 2,94 s). Agora o import espera também dois `requestAnimationFrame`, isto é, um quadro já pintado.
- **Fora do escopo:** telas logadas (#5, dependem de #2), layout e visual.

### Engenharia
- **Arquitetura:** a `Demonstracao` passa a fazer parte do bundle de entrada; as demais páginas seguem sob demanda; o `supabase-js` segue fora da primeira carga (o import dinâmico do `AuthContext` não mudou).
- **Riscos:** o bundle de entrada cresce ~5 kB (155,7 → 161,0 kB; gzip 50,7 → 52,2 kB) para todas as rotas.
- **Qualidade:** teste Playwright novo (`e2e/primeira-carga.spec.ts`) corta todo JS que não está no `index.html` e exige o `h1` visível; com o `lazy` de volta, ele falha (conferido localmente). Lighthouse móvel local num servidor com gzip, 3 execuções antes e depois, nas versões 12.8.2 (a da medição no site) e 13.6.0. Os números estão no `MVP.md`, critério 7.
- **Definição de pronto:** CI verde no PR para a sprint, revisão independente sem erro aberto, `MVP.md` com a medida local e o critério 7 ainda "Não atende" até a medida no site.

### Plano de ação
- **Executa:** a importação direta, o `supabase-js` depois da primeira pintura, o teste de regressão, a medida local e a atualização do `MVP.md` e do README.
- **Fica para depois do merge do #40:** medir no site (3 execuções, mediana, TBT e elemento) e levar o critério 7 a "Atende" (#16, do responsável).

## Ciclo de 16/11/2026

Executado em 16/11/2026, nas branches `feature/2026-11-16` → `developer/sprint-2026-11-19` (criada a partir da `main`, porque o PR #27 foi mesclado em 16/11). O merge na `main` fica com o responsável. Nível: Produto (N3). O Supabase publicado segue fora do ar (#2), então o ciclo cuida do que o código e o site público resolvem.

### Produto
- **Problema e público:** síndicos e fornecedores abrem o site no celular e chegam à demonstração e ao login. O texto do `MVP.md` precisa dizer só o que os testes provam.
- **Hipótese e meta:** a página pública funciona em 375 px sem rolagem horizontal, com axe sem violações; o login não manda a pessoa para fora do site; o critério 9 descreve os alertas abertos com o risco decidido por escrito.
- **O que a pesquisa trouxe:**
  - O aviso GHSA-wrjc-x8rr-h8h6 do React Router (moderado) afeta a v6 inteira e só tem correção na 7.18: o risco existe quando o app passa um caminho vindo de fora para `navigate` ou `<Link>` ([GitHub Advisory Database](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6)). O login faz isso com o destino depois da entrada.
  - A OWASP recomenda aceitar como retorno só caminhos locais, conferidos depois de interpretar a URL, e recusar entradas ambíguas ([OWASP, Unvalidated Redirects and Forwards Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)). Daí a função `destinoSeguro`.
  - A WCAG 2.1, critério 1.4.10 (Reflow), pede conteúdo legível em 320 px de largura sem rolar nas duas direções ([W3C, Understanding Reflow](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)). O teste "escuro" do Playwright repetia o claro, porque o app não tem tema escuro próprio (o `tailwind.config.ts` usa `darkMode: ["class"]` e nenhum CSS define `.dark` nem `prefers-color-scheme`). Ele dá lugar a um projeto de celular com teste de rolagem horizontal.
- **Backlog (impacto × esforço):**
  1. Patches de dependências pelo `npm audit fix` e destino do login validado, com teste (alto × baixo). Este ciclo.
  2. ADR com o risco decidido dos alertas que só a versão maior corrige (react-router 7, zod 4) (alto × baixo). Este ciclo; a migração vira issue.
  3. Trocar o projeto "escuro" falso pelo celular, com teste de rolagem horizontal e axe (médio × baixo). Este ciclo.
  4. Medir o LCP da `/demonstracao` e do `/entrar` no site, que agora roda o código da `main` (médio × baixo). Este ciclo. A #16 fica só com a medição depois da publicação (do responsável, que a fecha); a correção de código, se a mediana passar de 2,5 s, vira issue própria (#36).
  5. `docs/DEPLOY.md` com o passo a passo da Vercel e do Supabase; `dependabot.yml` para atualizações semanais (médio × baixo). Este ciclo.
  6. Ligar os alertas do Dependabot, restaurar o backend, conta do GoatCounter (#2, #17). Responsável.
- **Fora do escopo:** Supabase, Vercel, Settings, segredos, regras de negócio e as contas de demonstração (risco aceito pelo responsável).

### Engenharia
- **Arquitetura:** SPA React 18 + Vite na Vercel; Supabase (Auth, PostgREST, RLS, PostGIS) como backend. `destinoSeguro` fica em `src/lib/destino.ts`, sem dependência de React, para teste unitário.
- **Riscos:** o backend fora do ar impede medir as telas logadas; a migração para o React Router 7 mexe em todas as rotas e fica para uma issue.
- **Qualidade:** Vitest (unidade e telas), Playwright com axe no job `front`, cenário do banco no job `banco`, `npm audit --omit=dev`, Lighthouse móvel no site.
- **Definição de pronto:** CI verde no PR para a sprint, revisão independente sem erro aberto, `MVP.md`, README e `DEPLOY.md` atualizados, PR sprint → `main` com `revisao-responsavel`.

### Plano de ação
- **Executa:** itens 1 a 5 do backlog.
- **Vira issue:** ligar os alertas do Dependabot (responsável); migrar para React Router 7 e zod 4; contraste no navegador (#28) e telas de detalhe (#29) seguem abertas.

## Ciclo de 09/11/2026

Executado em 09/11/2026, nas branches `feature/2026-11-09` → `developer/sprint-2026-11-12` (criada a partir da sprint). O merge na `main` fica com o responsável (PR #27). Nível: Produto (N3). Escopo: só o que o código resolve sem o Supabase pausado (#2): critério 6 (#24), critério 8 (#25) e a parte de código do critério 7 (#16).

### Produto
- **Problema e público:** síndicos, moradores e fornecedores precisam de resposta clara quando uma tela logada falha, fica vazia ou é usada só com teclado.
- **Hipótese e meta:** toda tela logada com consulta mostra carregamento, erro com "Tentar de novo" e vazio, com teste; o axe não acha violação nas telas logadas, e o teclado alcança e aciona tudo.
- **O que a pesquisa trouxe:**
  - O axe declara suporte limitado ao jsdom e diz que a regra de contraste não funciona nele; a recomendação é desligá-la ali e medir contraste num navegador real ([README do axe-core 4.14](https://cdn.jsdelivr.net/npm/axe-core@4.14.0/README.md); [relato sobre contraste no CI](https://dev.to/jangwook_kim_e31e7291ad98/why-color-contrast-disappears-when-you-put-axe-core-in-ci-2ak8)). Por isso o contraste das telas logadas virou issue própria.
  - No padrão de diálogo modal, ao fechar, o foco volta ao elemento que abriu o diálogo ([WAI-ARIA APG, Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/); [WCAG, técnica H102](https://www.w3.org/WAI/WCAG22/Techniques/html/H102)). O teste de teclado mostrou que os dois diálogos de Condomínios não faziam isso.
- **Backlog (impacto × esforço):**
  1. Erro, vazio e carregamento testados em painel, condomínios, oportunidades, propostas, contratações e notificações (alto × baixo). Este ciclo.
  2. Axe e teclado nas telas logadas, dentro do Layout (alto × médio). Este ciclo.
  3. Contraste das telas logadas num navegador real com a API simulada (médio × médio). Issue nova.
  4. Telas de detalhe (lista, oportunidade, contratação, condomínio, perfil do fornecedor, admin) com o mesmo teste (médio × médio). Issue nova.
  5. Primeira carga da `/demonstracao` mais leve (#16) (médio × baixo). Este ciclo.
  6. Medir o LCP no site depois do merge na `main` (#16) e nas telas logadas (#5); backend, medição e proteção da `main` (#2, #17, #18). Responsável.
- **Fora do escopo:** Supabase, Vercel, segredos, contas de demonstração (são de teste e ficam como estão).

### Engenharia
- **Arquitetura:** as telas usam `useQuery` com funções de `features/*/api.ts`; os testes trocam essas funções por `vi.fn()` (`vi.mock` com o módulo original preservado). As consultas de notificações saíram da tela para `features/notificacoes/api.ts`, para poder simular. `src/test/apoio.tsx` concentra os dados fictícios e a montagem (QueryClient sem novas tentativas, rota e autenticação).
- **Correções que os testes acharam:** em Oportunidades, "Tentar de novo" refazia só a consulta de oportunidades, e a falha do cadastro do fornecedor ficava para sempre; agora refaz a que falhou. Esconder oportunidade e marcar notificação como lida falhavam em silêncio; agora avisam. Os diálogos de Condomínios não devolviam o foco ao botão (sem `DialogTrigger`). O seletor de administradora não tinha rótulo ligado. Nova lista, cadastro do fornecedor e administração ignoravam a falha de consultas secundárias. O token `--warning` dava 2,84:1 no selo âmbar (passa a 4,77:1).
- **Desempenho (#16):** as fases do LCP no JSON do Lighthouse mostraram atraso de renderização de ~2,5 s, com o CSS do Google Fonts bloqueando ~0,9 s e o `supabase-js` e o Radix na primeira carga (o `manualChunks` em objeto fazia o chunk do Radix importar o do Supabase). Agora `configurado` vem de `lib/config.ts`, o `Layout` e o cliente do Supabase são carregados sob demanda (nas páginas públicas, quando o navegador fica ocioso) e a fonte não bloqueia a pintura. JS pré-carregado: ~191 → ~104 kB gzip. LCP local, Lighthouse 12.8.2 móvel: 2,32 / 2,51 / 2,97 / 1,85 s (mediana 2,42 s), antes 3,07 / 2,98 / 2,97 s.
- **Riscos:** API simulada não pega erro do banco real (fica com o cenário do job `banco`); jsdom não mede contraste.
- **Qualidade:** `npx vitest run` com 86 testes em 7 arquivos (eram 30); `src/test/contraste.test.ts` calcula o contraste dos tokens; lint, tipos e build no job `front`. Revisão independente feita por subagente que viu só o diff: nenhum defeito alto ou médio; três ajustes de teste aplicados.
- **Definição de pronto:** CI verde no PR para a sprint, `MVP.md` e README atualizados, comentário no PR #27.

### Plano de ação
- **Executa:** #24 e #25 (código e testes), a parte de código de #16, `MVP.md`, README, comentário no PR #27.
- **Vira issue:** contraste das telas logadas em navegador; testes das telas de detalhe.

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
