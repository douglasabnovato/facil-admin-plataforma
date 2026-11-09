# MVP — critérios

**Nível:** Produto (N3), 12 critérios. Estado em 09/11/2026 (ciclo de 07/11/2026).

**Resumo:** 5 de 12 aplicáveis atendidos

**Finalizado:** não

| # | Critério | Situação em 09/11/2026 | Evidência ou o que falta | Issue |
|---|---|---|---|---|
| 1 | Problema e público claros | Atende | Marketplace que liga condomínios a fornecedores por listas de necessidades | — |
| 2 | Hipótese a validar | Atende | Hipótese com meta na revisão de 02/11/2026 (Histórico) | — |
| 3 | Fluxo principal completo | Parcial | Só a `/demonstracao` funciona no site (`curl` deu 200 em 09/11/2026); o fluxo real depende do backend pausado | #2 (responsável) |
| 4 | Escopo enxuto | Atende | Lista "Fora do MVP" na revisão de 02/11/2026 (Histórico) | — |
| 5 | Medição de uso | Não atende | Nada coleta uso | #17 (responsável) |
| 6 | Falhas tratadas | Parcial | Demonstração, login e agora a tela de necessidades têm erro, vazio e carregamento testados (`npx vitest run`, 30 de 30 em 09/11/2026, com `src/test/listas.test.tsx`). As demais telas logadas usam o mesmo `ErroCarga`, mas sem teste | #24 |
| 7 | Desempenho aceitável | Parcial | `/demonstracao` com mediana de 2,36 s (06/11/2026); telas logadas sem medição | #16, #5 |
| 8 | Acessibilidade básica | Parcial | Demonstração e login com Lighthouse 100; telas logadas sem Lighthouse nem axe | #5, #25 |
| 9 | Segurança e conformidade | Parcial | RLS e funções testadas no cenário do banco; o backend publicado está pausado e não pôde ser conferido. Contas de demonstração são de teste, aceitas pelo responsável | #2 (responsável) |
| 10 | Entrega confiável | Parcial | `main` sem proteção (regra 3 do processo) | #18 (responsável) |
| 11 | Testes dos fluxos críticos | Atende | Job `banco` do CI roda `supabase/tests/cenario.py` no Postgres com PostGIS: cria a lista, recebe 3 propostas, escolhe, passa pelo conselho e aprova (`FALHAS: 0` no run 42205237078 da `main`, 06/11/2026). Job `front`: 30 testes (09/11/2026) | — |
| 12 | Documentação honesta | Atende | README e este arquivo dizem o que está no ar e o que depende do backend; `docs/AMBIENTE-LOCAL.md` ensina a rodar com Supabase local | — |

**Atendidos:** 1, 2, 4, 11 e 12. **Parciais:** 3, 6, 7, 8, 9 e 10. **Não atendido:** 5.

**Para "Finalizado":** testar erro e vazio nas demais telas logadas (#24), rodar o axe nelas (#25) e levar a `/demonstracao` a 2,5 s com folga (#16). Os critérios 3, 5, 9 e 10 dependem do responsável (#2, #17, #18), com o rótulo `depende-do-responsavel`.

**CI da `main`:** os jobs `front` e `banco` passam. O agendamento `Manter Supabase ativo` falhava toda semana sem as Variables; neste ciclo passou a terminar com aviso (#19), o que só vale depois do merge na `main`.

## Histórico

Tabelas e revisões anteriores, mantidas como registro. O estado vale só na tabela do topo.

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
