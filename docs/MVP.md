# MVP — critérios

**Nível:** Produto (N3), 12 critérios. Estado em 18/11/2026 (ciclo de 18/11/2026: `feature/2026-11-18` → `developer/sprint-2026-11-19`; LCP medido no site com a `main` `a459a06`; issues #36, #37, #38, #42 e #58). Ciclos anteriores no Histórico.

**Resumo:** 8 de 12 aplicáveis atendidos

**Finalizado:** não

## Produto

- **Problema:** condomínios precisam pedir, comparar e aprovar serviços com prestação de contas; fornecedores de facilities precisam achar essas demandas na sua região e categoria.
- **Público:** síndicos e administradoras de condomínio, de um lado; fornecedores de facilities, do outro.
- **Hipótese:** acreditamos que, se uma lista publicada receber ao menos 3 propostas comparáveis por item, o condomínio escolhe em até 7 dias, sem pedir orçamento por fora. Saberemos quando a consulta no banco e os eventos do GoatCounter mostrarem esse número em 4 semanas de uso.
- **Métrica:** parcela das listas com 3 propostas ou mais que têm proposta escolhida em até 7 dias, medido por consulta no banco (listas publicadas, propostas por lista e dias até `escolher_proposta`) e pelos eventos `lista-publicar` e `demonstracao-escolher` do GoatCounter — meta: 60% no piloto. Depende do backend (#2) e da conta de medição (#17).

**Problema e público:** síndicos e administradoras de condomínio precisam pedir, comparar e aprovar serviços com prestação de contas; fornecedores de facilities precisam achar essas demandas na sua região e categoria.

**Hipótese:** acreditamos que, se uma lista publicada receber ao menos 3 propostas comparáveis por item, o condomínio escolhe em até 7 dias, sem pedir orçamento por fora. **Meta:** no piloto, 60% das listas com 3 propostas ou mais têm proposta escolhida em até 7 dias. **Saberemos quando** a consulta no banco (listas publicadas, propostas por lista e dias até `escolher_proposta`) e os eventos `lista-publicar` e `demonstracao-escolher` do GoatCounter mostrarem esse número em 4 semanas de uso. Depende do backend (#2) e da conta de medição (#17).

**Fora do MVP:** pagamento na plataforma, emissão de nota, aplicativo móvel, medição de IoT e e-mail com domínio próprio.

## Critérios

| # | Critério | Situação em 18/11/2026 | Evidência (comando, data e resultado) ou o que falta | Issue |
|---|---|---|---|---|
| 1 | Problema e público claros | Atende | Frase "Problema e público" acima e no README | — |
| 2 | Hipótese a validar | Atende | Hipótese com meta e "saberemos quando" acima; a validação depende de #2 e #17 | — |
| 3 | Fluxo principal completo | Parcial | `npm run test:e2e` (Playwright, job `front`), 16/11/2026, local: 12 de 12 nos projetos `desktop` e `celular` (375 px). Na `/demonstracao`, compara 3 propostas, ordena, escolhe e mostra a regra de aprovação, também só com teclado; no login, envio real pelo navegador com o backend fora do ar mostra a falha; axe sem violações. Falta o fluxo real logado: o Supabase do build publicado não resolve no DNS (`curl` em `/auth/v1/health`, 16/11/2026: código 6) | #2 (responsável), #33 |
| 4 | Escopo enxuto | Atende | Seção "Fora do MVP" acima | — |
| 5 | Medição de uso | Parcial | Código pronto e no ar: o JS publicado (`assets/index-CgGyYDSP.js`, 16/11/2026) contém `goatcounter.com/count`; `npx vitest run src/test/medicao.test.ts`: 4 de 4. Falta a conta do GoatCounter e o painel com visitas | #17 (responsável) |
| 6 | Falhas tratadas | Atende | `npx vitest run`, 18/11/2026: 10 arquivos, 100 testes passando. Carregamento, erro com "Tentar de novo" e vazio em painel, condomínios, necessidades, nova lista, oportunidades, propostas, contratações, notificações, cadastro do fornecedor e administração (`src/test/telas-logadas.test.tsx`, `listas.test.tsx`), mais demonstração, login e cadastro com falha de rede e erro do servidor no navegador (`e2e/fluxo.spec.ts`, `e2e/cadastro.spec.ts`, 18/11/2026). Telas de detalhe em #29 | #29 |
| 7 | Desempenho aceitável | Parcial | **`/demonstracao` atende no site.** Build de Production do commit `a459a06`, o mesmo da `main` (API de deployments), `npx lighthouse@12.8.2 https://facil-admin-plataforma.vercel.app/demonstracao --only-categories=performance --form-factor=mobile --output=json --chrome-flags="--headless --no-sandbox"`, 18/11/2026, 21:01 a 21:08, 8 execuções, 7 válidas: LCP 2,75 / 1,56 / 1,54 / 1,47 / 1,47 / 2,11 / 1,99 s, **mediana 1,56 s**, TBT 64 a 290 ms, elemento do LCP sempre o `h1` (uma execução descartada: TBT 6,5 s e FCP observado de 2,7 s, máquina carregada). **`/entrar` não atende no site:** mesma versão, 18/11/2026, 21:16, 3 execuções: 3,57 / 2,80 / 3,13 s, **mediana 3,13 s**, TBT 17 a 102 ms, elemento o subtítulo `p.mt-1`. Causa: o login importava o `supabase-js` (~60 kB gzip) no topo do chunk sob demanda. **Correção na sprint (#58):** login e cadastro pedem o cliente só no envio, e a sessão nessas telas espera a primeira pintura. Medida local, build de produção servido com gzip, `/entrar`, 18/11/2026, execuções alternadas: antes 2,64 / 2,65 / 2,64 / 2,62 / 2,62 / 2,63 s (mediana 2,635 s), depois 2,36 / 2,31 / 2,31 s (**mediana 2,31 s**), TBT até 43 ms; `/demonstracao` sem mudança (antes 1,52 / 1,58 s, depois 1,51 / 1,52 s). No site o `/entrar` ficou ~0,5 s acima da medida local: **remedir no ar depois do merge na `main`**. Telas logadas sem medição (backend) | #58, #5 (responsável) |
| 8 | Acessibilidade básica | Atende | `npm run test:e2e`, 18/11/2026: 30 de 30; axe sem violações na `/demonstracao`, no login e no cadastro (sucesso, erro do servidor, falha de rede e validação), em desktop e no celular (375 px); no cadastro, campo inválido com `aria-invalid` e a mensagem ligada por `aria-describedby`, e o foco vai ao primeiro erro (#38); o vermelho do aviso de erro passou de 4,34:1 para o token `--destructive` (#38); teclado (Tab até o botão e Enter decide); sem rolagem horizontal em 375 e 320 px na demonstração, no login e no cadastro. O app não tem tema escuro próprio (nenhum `.dark` nem `prefers-color-scheme` no CSS), por isso não há teste no escuro. Telas logadas: axe no jsdom em 8 telas, teclado e diálogos (`src/test/acessibilidade.test.tsx`); contraste dos 12 pares de tokens (`src/test/contraste.test.ts`). Lighthouse no site, 16/11/2026: acessibilidade 100 nas 11 execuções. Contraste das telas logadas no navegador em #28 | #28 |
| 9 | Segurança e conformidade | Parcial | `gh api "repos/douglasabnovato/facil-admin-plataforma/dependabot/alerts?state=open&per_page=100" --jq length`, 18/11/2026, 21:15: **0 alertas abertos** (os 18 de 16/11 foram corrigidos pelo PR #55 e estão na `main` pelo PR #56). `npm audit --omit=dev` e `npm audit`, 18/11/2026, 21:15: 0 vulnerabilidades. Decisão na `docs/adr/0002-corrigir-alertas-dependabot.md`, que substitui a ADR 0001: runtime `react-router-dom` 7.18.5 (#5, #6) e `zod` 4.6.7 (#18), com `@hookform/resolvers` 5.9.2; desenvolvimento `vite` 6.4.6 (#1 a #4, #12 a #16), `vitest` 4.1.12 (#7 a #10, #17) e `typescript-eslint` 8.73 (#20). `npm audit --omit=dev` e `npm audit`, 16/11/2026, 15:12: 0 vulnerabilidades. Lint, tipos, 95 testes, build e 14 de 14 no Playwright passando, local e no CI do PR #55. Destino do login validado (`src/lib/destino.ts`, testes em `src/test/destino.test.ts` e `telas.test.tsx`). Nenhum segredo no código (`.env.example` só com nomes). Contas de demonstração: risco aceito pelo responsável. **Falta:** RLS e funções testadas no job `banco`, mas o backend publicado não pôde ser conferido (#2) | #2 (responsável) |
| 10 | Entrega confiável | Atende | `gh api repos/douglasabnovato/facil-admin-plataforma/rules/branches/main`, 16/11/2026: `deletion`, `non_fast_forward`, `pull_request` e `required_status_checks` com `front` e `banco`. O workflow `CI` roda em todo PR; a Vercel publica a `main` | — |
| 11 | Testes dos fluxos críticos | Atende | Run 43799472590 do `CI` na `main` (16/11/2026, merge do PR #27): job `banco` com `FALHAS: 0` no cenário `supabase/tests/cenario.py` (cria a lista, recebe 3 propostas, escolhe, passa pelo conselho e aprova) e job `front` verde, com o Playwright sem `skip` | — |
| 12 | Documentação honesta | Atende | README com os comandos do `package.json` (`dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`), conferidos em 18/11/2026; `docs/DEPLOY.md` com o estado da Vercel, do Supabase e dos alertas em 18/11/2026; `docs/AMBIENTE-LOCAL.md` com o Supabase local; `docs/CONFIGURACAO.md` sem o Pages (#37): `grep -rn "github.io/facil-admin-plataforma" docs README.md src` volta vazio, 18/11/2026 | — |

**Atendidos:** 1, 2, 4, 6, 8, 10, 11 e 12. **Parciais:** 3, 5, 7 e 9. **Não atendidos:** nenhum.

**Por que "Finalizado: não":** falta um item de código no critério 7: o `/entrar` mediu 3,13 s no site. A correção (#58) está na sprint e baixou a medida local de 2,635 para 2,31 s; falta o merge na `main` (responsável) e a medida no site. A `/demonstracao` já atende no ar (1,56 s). Os demais que faltam dependem do responsável: 3 e 9 (#2, backend), 5 (#17, conta do GoatCounter) e as telas logadas do 7 (#5).

**CI deste ciclo:** ver o PR do ciclo de 18/11/2026 (`feature/2026-11-18` → `developer/sprint-2026-11-19`). Local, 18/11/2026: `npm run lint` e `npm run typecheck` sem erro, `npx vitest run` 100 de 100, `npm run test:e2e` 30 de 30 (build de produção).

## Histórico

Tabelas e revisões anteriores, mantidas como registro. O estado vale só na tabela do topo.

- 20/11/2026: bloco Produto padronizado, sem mudar critérios.

### Revisão de 18/11/2026 (LCP no site com a `main`)

O critério 7 passou de "Não atende" para "Parcial": a `/demonstracao` mediu 1,56 s no site (antes 2,79 s, 16/11/2026, com o código anterior ao PR #41), e o `/entrar` mediu 3,13 s (correção na #58). Os critérios 6, 8, 9 e 12 ganharam evidência nova, sem mudar de situação. **Resumo:** segue 8 de 12. **Finalizado:** segue não. Linha do critério 7 até então:

| # | Critério | Situação em 16/11/2026 | Evidência | Issue |
|---|---|---|---|---|
| 7 | Desempenho aceitável | Não atende | **No site** (`https://facil-admin-plataforma.vercel.app`, build de Production do commit `26a530f`, o mesmo da `main`), `npx lighthouse@12.8.2 <url> --only-categories=performance,accessibility --form-factor=mobile --output=json --chrome-flags="--headless --no-sandbox"`, 16/11/2026, `/demonstracao`, 7 execuções: LCP 3,36 / 1,50 / 2,04 / 3,15 / 2,75 / 3,36 / 2,79 s, **mediana 2,79 s**; TBT 107 a 316 ms; elemento do LCP: o `h1` (5 de 7) ou o `span` do carregamento (2 de 7). `/entrar`, 4 execuções: mediana 2,73 s. Causa: o `h1` esperava o chunk sob demanda. **Correção mesclada na sprint pelo PR #41 (issue #36, commits `0dcfef2` e `3d72031`), medida localmente** num build de produção servido com gzip, `/demonstracao`, 3 execuções em cada versão, 16/11/2026, elemento do LCP sempre o `h1` "Compare propostas e escolha sem favorecimento": Lighthouse 12.8.2, antes 2,97 / 2,89 / 1,89 s (mediana 2,89 s, TBT mediano 203 ms), depois 2,45 / 2,45 / 2,42 s (**mediana 2,45 s**, TBT mediano 46 ms); Lighthouse 13.6.0, antes 3,00 / 2,94 / 2,94 s (mediana 2,94 s, TBT mediano 305 ms), depois 0,78 / 0,78 / 0,79 s (mediana 0,78 s, TBT mediano 363 ms). A versão que vale para comparar com o site é a 12.8.2; a 13.6.0 simula a carga de outro jeito e dá números bem menores no depois, sem explicação conferida. Medida local não conta para o critério: **remedir no ar depois do merge do #40**. A folga na 12.8.2 é pequena (0,05 s), e o TTFB do site (~0,6 s) é maior que o local. Telas logadas sem medição (backend) | #36, #16 e #5 (responsável) |

### Revisão de 16/11/2026, 15:12 (alertas corrigidos)

Só o critério 9 mudou de motivo: antes, Parcial com 15 alertas de desenvolvimento sem decisão (#52) e 3 de runtime aceitos na ADR 0001 sem confirmação do responsável; agora, os 18 corrigidos por atualização na sprint-19 (PR #55, ADR 0002, que substitui a 0001). Segue Parcial só pelo backend publicado (#2). **Resumo:** segue 8 de 12. **Finalizado:** segue não.

### Revisão de 16/11/2026, 12:00 (alertas do Dependabot)

Só o critério 9 mudou de motivo: antes, Parcial com os alertas desligados (403, #34); agora, Parcial com 15 alertas de desenvolvimento sem correção nem decisão (#52). Os 3 de runtime seguem na ADR 0001. **Resumo:** segue 8 de 12. **Finalizado:** segue não.

### Tabela de 10/11/2026 (ciclo da faixa de 90%)
**Resumo:** 8 de 12 aplicáveis atendidos (1, 2, 4, 6, 8, 10, 11 e 12). **Finalizado:** sim.

| # | Critério | Situação | O que mudou em 16/11/2026 |
|---|---|---|---|
| 7 | Desempenho aceitável | Parcial | A medição era local (mediana 2,42 s); no site, com a `main`, a mediana foi 2,79 s: passou a "Não atende" |
| 8 | Acessibilidade básica | Atende | Dizia "claro e escuro", mas o app não tem tema escuro; o projeto "escuro" virou "celular" |
| 9 | Segurança e conformidade | Parcial | Não citava o Dependabot desligado nem os avisos do `npm audit` |

Os demais critérios estavam como na tabela do topo.

### Tabela de 09/11/2026 (ciclo de 09/11/2026)
**Resumo:** 8 de 12 aplicáveis atendidos (1, 2, 4, 6, 8, 10, 11 e 12). **Finalizado:** sim.

| # | Critério | Situação | Evidência ou o que faltava |
|---|---|---|---|
| 3 | Fluxo principal completo | Parcial | Só a `/demonstracao` funcionava no site; sem teste no navegador |
| 5 | Medição de uso | Não atende | Nada coletava uso |

### Tabela de 09/11/2026, antes do ciclo de 09/11 (ciclo de 07/11/2026)
**Resumo:** 5 de 12 aplicáveis atendidos (1, 2, 4, 11 e 12). **Finalizado:** não. Parciais: 3, 6, 7, 8, 9 e 10; não atendido: 5.

| # | Critério | Situação | Evidência ou o que faltava |
|---|---|---|---|
| 6 | Falhas tratadas | Parcial | Demonstração, login e a tela de necessidades testados (30 testes); demais telas logadas sem teste (#24) |
| 7 | Desempenho aceitável | Parcial | `/demonstracao` com mediana de 2,36 s (06/11/2026); telas logadas sem medição (#16, #5) |
| 8 | Acessibilidade básica | Parcial | Demonstração e login com Lighthouse 100; telas logadas sem axe (#25) |

Os demais critérios estavam como na tabela do topo.

### Avaliação de 31/10/2026
**Nível:** N3 (produto). **Resumo em 06/11/2026:** 3 de 12 atendem (1, 2, 4), 8 parciais, 1 não atende (5). **Finalizado: não.** Falta o código resolver os critérios 6, 7, 8, 11 e 12 (#5, #15, #16); 3, 5, 9 e 10 dependem do responsável (#2, #17, #18).

> Avaliação de 31/10/2026 com os mesmos 12 critérios usados no `movies`. "Não medido" significa que não há evidência, não que falhe.

| # | Critério | Como verificar | Situação |
|---|---|---|---|
| 1 | Problema e público claros | Dá para explicar em uma frase | Atende |
| 2 | Hipótese a validar | Existe uma aposta escrita, com meta | Atende: proposta abaixo |
| 3 | Fluxo principal completo | Uma pessoa conclui sem ajuda | Parcial: só a demonstração funciona; o fluxo real depende do backend (#2) |
| 4 | Escopo enxuto | O que não entra está registrado | Atende: lista abaixo |
| 5 | Medição de uso | A métrica principal é coletada | Não atende |
| 6 | Falhas tratadas | Erro, vazio e carregamento têm resposta clara | Parcial: demonstração e falha de rede no login tratadas; telas logadas não testadas |
| 7 | Desempenho aceitável | LCP de até 2,5 s no celular | Parcial: `/demonstracao` com mediana de 2,36 s em 06/11/2026; telas logadas sem medição (#5, #16) |
| 8 | Acessibilidade básica | Lighthouse e teclado | Parcial: demonstração e login sem falha; telas logadas não testadas |
| 9 | Segurança e conformidade | Riscos decididos; termos cumpridos | Parcial: backend fora do ar; dados públicos de teste aceitos pelo responsável |
| 10 | Entrega confiável | Publicação só depois de CI verde | Parcial |
| 11 | Testes dos fluxos críticos | Testes automatizados no CI | Parcial: 21 testes unitários e de tela; nenhum fluxo contra o banco |
| 12 | Documentação honesta | Qualquer pessoa roda o projeto, e os números estão certos | Parcial: README corrigido; rodar localmente exige o Supabase |

### Medições de 01/11/2026

Lighthouse 12.8.2 local, móvel, só na tela de login, porque o backend publicado não responde (#2).

| Execução | LCP | FCP | CLS | Desempenho | Acessibilidade |
|---|---|---|---|---|---|
| 1 | 3,43 s | 2,62 s | 0 | 83 | 100 |
| 2 | 3,57 s | 3,49 s | 0 | 83 | 100 |
| 3 | 3,38 s | 3,30 s | 0 | 85 | 100 |

**Mediana do LCP:** 3,43 s, acima da meta de 2,5 s.

**Teclado:** o login tem a ordem marca, e-mail, esqueci a senha, senha, entrar e cadastro, com nome e foco visível. O envio não foi testado. O fluxo de necessidades fica para depois de restaurar o backend.

### Revisão de 02/11/2026

**Hipótese (proposta, sem validação):** Se o condomínio receber ao menos 3 propostas comparáveis em uma lista publicada, a escolha sai em menos de 7 dias, sem pedir orçamento por fora.

**Fora do MVP (proposta):** Pagamento na plataforma, emissão de nota, aplicativo móvel e medição de IoT.

**Medição:** Lighthouse 12.8.2 local, móvel, 3 execuções no site publicado. Em `/demonstracao`: LCP 3,74 / 3,59 / 3,38 s (mediana 3,59 s), acessibilidade 100. Essa rota não usa o backend, e as telas logadas não foram medidas. O resultado varia entre execuções, e não houve teste em celular real.

**Critério 5:** segue sem atender, porque nada coleta uso; depende de uma conta de medição do responsável.

### Revisão de 06/11/2026 (ciclo de 03/11/2026)

- A demonstração ordena as propostas por aderência, valor ou prazo e avisa se o mínimo de 3 propostas por escrito foi atingido. Testes: `src/test/regras.test.ts` e `src/test/telas.test.tsx` (25 testes, antes 21). Nenhum critério mudou de situação.
- Critério 10 segue "Parcial": a `main` não tem proteção (#18).
- CI: na `main`, só o agendamento `Manter Supabase ativo` falha, porque o projeto está pausado e as Variables estão vazias (#2, #19). Os jobs `front` e `banco` passam.

**Medição depois do merge (PR #21):** Lighthouse 12.8.2, móvel, 3 execuções em https://facil-admin-plataforma.vercel.app/demonstracao. LCP 3,60 / 2,36 / 2,36 s (mediana 2,36 s), desempenho 81 / 90 / 89, acessibilidade 100. A primeira execução, com cache frio, passou de 2,5 s. O critério 7 vai para "Parcial", porque as telas logadas não foram medidas.
