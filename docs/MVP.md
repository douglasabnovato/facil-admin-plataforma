# MVP — critérios

> Avaliação de 31/10/2026 com os mesmos 12 critérios usados no `movies`. "Não medido" significa que não há evidência, não que falhe.

| # | Critério | Como verificar | Situação |
|---|---|---|---|
| 1 | Problema e público claros | Dá para explicar em uma frase | Atende |
| 2 | Hipótese a validar | Existe uma aposta escrita, com meta | Parcial |
| 3 | Fluxo principal completo | Uma pessoa conclui sem ajuda | Não atende |
| 4 | Escopo enxuto | O que não entra está registrado | Parcial |
| 5 | Medição de uso | A métrica principal é coletada | Não atende |
| 6 | Falhas tratadas | Erro, vazio e carregamento têm resposta clara | Parcial |
| 7 | Desempenho aceitável | LCP de até 2,5 s no celular | Parcial: 3,4 s na tela de login; o restante depende do backend (#2) |
| 8 | Acessibilidade básica | Lighthouse e teclado | Parcial: login com Lighthouse 100 e teclado sem falha; necessidades não testadas (#2) |
| 9 | Segurança e conformidade | Riscos decididos; termos cumpridos | Não atende |
| 10 | Entrega confiável | Publicação só depois de CI verde | Parcial |
| 11 | Testes dos fluxos críticos | Testes automatizados no CI | Parcial |
| 12 | Documentação honesta | Qualquer pessoa roda o projeto, e os números estão certos | Parcial |

## Medições de 01/11/2026

Lighthouse 12.8.2 local, móvel, só na tela de login, porque o backend publicado não responde (#2).

| Execução | LCP | FCP | CLS | Desempenho | Acessibilidade |
|---|---|---|---|---|---|
| 1 | 3,43 s | 2,62 s | 0 | 83 | 100 |
| 2 | 3,57 s | 3,49 s | 0 | 83 | 100 |
| 3 | 3,38 s | 3,30 s | 0 | 85 | 100 |

**Mediana do LCP:** 3,43 s, acima da meta de 2,5 s.

**Teclado:** o login tem a ordem marca, e-mail, esqueci a senha, senha, entrar e cadastro, com nome e foco visível. O envio não foi testado. O fluxo de necessidades fica para depois de restaurar o backend.
