# ADR 0002: corrigir os alertas do Dependabot por atualização

**Data:** 16/11/2026. **Situação:** Aceita. **Substitui:** a [ADR 0001](0001-alertas-react-router-zod.md).

## Contexto

Ordem do responsável repassada pelo DG líder em 16/11/2026:

> "Regra geral por ADR. alertas que nao atrapalham a producao, pode passar. os que atrapalham, entender, escolher a melhor estrategia para manter a funcionalidade"

A ADR 0001, escrita por um agente e não confirmada pelo responsável, aceitava os alertas de runtime do `react-router` 6 e do `zod` 3 até uma migração (#35). Pela regra nova, o que roda no site vai para correção, não para aceite.

`gh api "repos/douglasabnovato/facil-admin-plataforma/dependabot/alerts?state=open&per_page=100"`, 16/11/2026, 14:38: 18 alertas abertos, todos no `package-lock.json`.

| Alerta | Pacote | Severidade | Quem o puxa | Chega à produção? |
|---|---|---|---|---|
| #5, #6 | `react-router` 6.30 | média | `react-router-dom` (dependência) | Sim: roteamento do site |
| #18 | `zod` 3.25 | alta | dependência direta | Sim: validação dos formulários |
| #2, #3, #4, #12, #13, #14, #15, #16 | `vite` 5.4 | 1 alta, 6 médias, 1 baixa | dependência de desenvolvimento | Não: servidor de desenvolvimento e build |
| #1 | `esbuild` 0.21 | média | `vite` 5 | Não: servidor de desenvolvimento |
| #8 | `vitest` 3.2 | média | dependência de desenvolvimento | Não: testes |
| #7, #17 | `@vitest/mocker` 3.2 | média | `vitest` 3 | Não: testes |
| #9, #10 | `tinypool` 1.1 | crítica | `vitest` 3 | Não: testes |
| #20 | `minimatch` 10.2 | média | `typescript-eslint` 8.72 | Não: lint |

## Decisão

Corrigir os 18 por atualização, sem aceitar risco:

- **Runtime:** `react-router-dom` 6.30 → 7.18.5 (traz `react-router` 7.18.5), `zod` 3.25 → 4.6.7 e `@hookform/resolvers` 3.10 → 5.9.2, a versão que aceita o zod 4. O código não precisou mudar: o app usa `BrowserRouter`, `Routes`, `Link`, `Navigate` e `useNavigate`, que o React Router 7 mantém, e esquemas simples do zod (`object`, `string`, `min`, `email`, `regex`, `refine`), que o zod 4 aceita.
- **Desenvolvimento:** `vite` 5.4 → 6.4.6 (traz `esbuild` 0.25), `vitest` 3.2 → 4.1.12 (traz `@vitest/mocker` 4.1.12 e não usa mais o `tinypool`) e `typescript-eslint` 8.72 → 8.73 (traz `minimatch` 11). O `vite` 6, e não o 8, porque o 8 troca o Rollup pelo Rolldown e o `manualChunks` do `vite.config.ts`, que segura o LCP (#36), precisaria ser refeito.
- Único ajuste de código: `src/test/contraste.test.ts` declara os tipos do Node, que o `vitest/globals` 4 deixou de trazer.

A mitigação do redirecionamento aberto (`destinoSeguro`, em `src/lib/destino.ts`) continua: é defesa em profundidade.

## Prova

16/11/2026, local, com os comandos do CI:

- `npm run lint`, `npm run typecheck`: sem erros.
- `npm test`: 9 arquivos, 95 testes passando.
- `npm run build`: build gerado.
- `npm run test:e2e`: 14 de 14 (desktop e celular), com axe e `e2e/primeira-carga.spec.ts`.
- `npm audit --omit=dev` e `npm audit`: 0 vulnerabilidades.

## Consequências

- Não há alerta com risco aceito. Os 18 fecham quando a correção chegar à `main` (PR sprint → `main`, do responsável).
- A #35 (migrar para React Router 7 e zod 4) e a #52 (alertas de desenvolvimento) ficam resolvidas por esta decisão.
- Os PRs do Dependabot para `vite` 8 e `vitest` 5 seguem com o responsável.

## Quando revisar

- Se um alerta novo aparecer: aplicar a mesma regra (chega ao site → corrigir; não chega → ADR de risco aceito).
- Na subida para o `vite` 8: refazer o `manualChunks` e medir o LCP de novo.
