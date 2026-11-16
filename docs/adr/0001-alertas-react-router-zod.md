# ADR 0001: alertas do react-router 6 e do zod 3 até a migração

**Data:** 16/11/2026. **Situação:** aceita pelo agente do ciclo, sob o mandato do responsável; revisão do responsável no PR sprint → `main`.

## Contexto

`npm audit --omit=dev`, 16/11/2026, depois do `npm audit fix` sem `--force`: restam 3 avisos, todos de dependência direta e só corrigidos em versão maior.

| Pacote | Versão | Aviso | Gravidade | Corrigido em |
|---|---|---|---|---|
| `react-router` / `react-router-dom` | 6.30 | [GHSA-wrjc-x8rr-h8h6](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6): redirecionamento aberto por barra invertida em `<Link>` e `useNavigate` | moderada | 7.18 |
| `react-router` | 6.30 | [GHSA-337j-9hxr-rhxg](https://github.com/advisories/GHSA-337j-9hxr-rhxg): injeção na hidratação do SSR (`deserializeErrors`) | moderada | 7.x |
| `zod` | 3.25 | [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): consumo de memória ao validar coleções muito grandes | alta | 4.6.6 |

Os alertas do Dependabot estão desligados no repositório (a API responde 403), então o `npm audit` é a única fonte hoje.

## Decisão

Manter as versões atuais até a migração (issue "Migrar para React Router 7 e zod 4"), com estas mitigações:

- **Redirecionamento aberto:** o único caminho vindo de fora que vai para `navigate` ou `<Navigate>` é o destino depois do login (`state.de`). Desde 16/11/2026 ele passa por `destinoSeguro` (`src/lib/destino.ts`), que só aceita caminhos locais e recusa barra invertida, barra dupla e as duas codificadas. Testes: `src/test/destino.test.ts` e o teste de login com sessão em `src/test/telas.test.tsx`.
- **Hidratação do SSR:** não se aplica. O app é uma SPA (Vite, `BrowserRouter`), sem SSR nem `deserializeErrors`.
- **zod:** o zod valida só formulários no navegador da própria pessoa (`zodResolver`). Quem mandar uma coleção enorme trava a própria aba. As regras que valem ficam no banco (RLS e funções), que não usa o zod.

## Consequências

- O critério 9 do `docs/MVP.md` cita esta ADR para cada aviso aberto do `npm audit`.
- A ADR perde a validade quando a migração entrar na `main`, ou se um aviso novo aparecer.
- Ligar os alertas do Dependabot é do responsável (issue própria); quando ligados, cada alerta aberto precisa estar aqui ou numa issue.
