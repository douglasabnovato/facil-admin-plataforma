# MVP — critérios

**Nível:** N3 (produto). **Resumo em 06/11/2026:** 3 de 12 atendem (1, 2, 4), 7 parciais, 2 não atendem (5, 7). **Finalizado: não.** Falta o código resolver os critérios 6, 7, 8, 11 e 12 (#5, #15, #16); 3, 5, 9 e 10 dependem do responsável (#2, #17, #18).

> Avaliação de 31/10/2026 com os mesmos 12 critérios usados no `movies`. "Não medido" significa que não há evidência, não que falhe.

| # | Critério | Como verificar | Situação |
|---|---|---|---|
| 1 | Problema e público claros | Dá para explicar em uma frase | Atende |
| 2 | Hipótese a validar | Existe uma aposta escrita, com meta | Atende: proposta abaixo |
| 3 | Fluxo principal completo | Uma pessoa conclui sem ajuda | Parcial: só a demonstração funciona; o fluxo real depende do backend (#2) |
| 4 | Escopo enxuto | O que não entra está registrado | Atende: lista abaixo |
| 5 | Medição de uso | A métrica principal é coletada | Não atende |
| 6 | Falhas tratadas | Erro, vazio e carregamento têm resposta clara | Parcial: demonstração e falha de rede no login tratadas; telas logadas não testadas |
| 7 | Desempenho aceitável | LCP de até 2,5 s no celular | Não atende: 3,59 s em 02/11/2026 |
| 8 | Acessibilidade básica | Lighthouse e teclado | Parcial: demonstração e login sem falha; telas logadas não testadas |
| 9 | Segurança e conformidade | Riscos decididos; termos cumpridos | Parcial: backend fora do ar; dados públicos de teste aceitos pelo responsável |
| 10 | Entrega confiável | Publicação só depois de CI verde | Parcial |
| 11 | Testes dos fluxos críticos | Testes automatizados no CI | Parcial: 21 testes unitários e de tela; nenhum fluxo contra o banco |
| 12 | Documentação honesta | Qualquer pessoa roda o projeto, e os números estão certos | Parcial: README corrigido; rodar localmente exige o Supabase |

## Medições de 01/11/2026

Lighthouse 12.8.2 local, móvel, só na tela de login, porque o backend publicado não responde (#2).

| Execução | LCP | FCP | CLS | Desempenho | Acessibilidade |
|---|---|---|---|---|---|
| 1 | 3,43 s | 2,62 s | 0 | 83 | 100 |
| 2 | 3,57 s | 3,49 s | 0 | 83 | 100 |
| 3 | 3,38 s | 3,30 s | 0 | 85 | 100 |

**Mediana do LCP:** 3,43 s, acima da meta de 2,5 s.

**Teclado:** o login tem a ordem marca, e-mail, esqueci a senha, senha, entrar e cadastro, com nome e foco visível. O envio não foi testado. O fluxo de necessidades fica para depois de restaurar o backend.

## Revisão de 02/11/2026

**Hipótese (proposta, sem validação):** Se o condomínio receber ao menos 3 propostas comparáveis em uma lista publicada, a escolha sai em menos de 7 dias, sem pedir orçamento por fora.

**Fora do MVP (proposta):** Pagamento na plataforma, emissão de nota, aplicativo móvel e medição de IoT.

**Medição:** Lighthouse 12.8.2 local, móvel, 3 execuções no site publicado. Em `/demonstracao`: LCP 3,74 / 3,59 / 3,38 s (mediana 3,59 s), acessibilidade 100. Essa rota não usa o backend, e as telas logadas não foram medidas. O resultado varia entre execuções, e não houve teste em celular real.

**Critério 5:** segue sem atender, porque nada coleta uso; depende de uma conta de medição do responsável.

## Revisão de 06/11/2026 (ciclo de 03/11/2026)

- A demonstração ordena as propostas por aderência, valor ou prazo e avisa se o mínimo de 3 propostas por escrito foi atingido. Testes: `src/test/regras.test.ts` e `src/test/telas.test.tsx` (25 testes, antes 21). Nenhum critério mudou de situação.
- Critério 10 segue "Parcial": a `main` não tem proteção (#18).
- CI: na `main`, só o agendamento `Manter Supabase ativo` falha, porque o projeto está pausado e as Variables estão vazias (#2, #19). Os jobs `front` e `banco` passam.
