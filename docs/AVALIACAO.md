# Avaliação — facil-admin-plataforma

> Data: 31/10/2026 · Base: `e49c5d5`.

## Evidências

| Item | Resultado |
|---|---|
| Lint, tipos, 18 testes e build | Passam localmente |
| CI do último commit | Verde em 01/10 |
| `npm audit --omit=dev` | 5 alertas: 2 altos e 3 moderados |
| Site na Vercel | Responde 200 e abre a tela de login |
| Endereço do Supabase usado pelo site | **Não existe no DNS público** (NXDOMAIN em 31/10) |
| Workflow `Manter Supabase ativo` | Falha toda semana desde 05/10: as Variables do repositório estão vazias |
| GitHub Pages | Responde 404 |

## Achados

| # | Severidade | Achado | Encaminhamento |
|---|---|---|---|
| A1 | Crítica | Sem o backend, login e cadastro não podem funcionar | Issue aberta |
| A2 | Alta | O workflow que evitaria a pausa nunca chega a consultar o banco | Configurar as Variables |
| A3 | Média | Alertas de dependências | Tratar depois de decidir o lote |
| A4 | Média | README e hospedagem: a revisão de 27/10 aponta divergências | O lote de 27/10 trata |

## Nota

**5,5**, nível N2 interrompido; meta N3. É um julgamento técnico.
