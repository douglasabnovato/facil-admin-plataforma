# FacilAdmin — Plataforma

Marketplace de facilities para condomínios. Síndicos, administradoras e moradores publicam **listas de necessidades**. Fornecedores **verificados** da região recebem as oportunidades compatíveis, enviam **propostas por item** e o condomínio compara, aprova (com o conselho, quando o valor exige) e avalia.

Desenvolvida pela equipe do ecossistema LearnTECH desde a ideação com o cliente até a aprovação do mvp.

## O que resolve
| Para o condomínio | Para o fornecedor |
|---|---|
| Propostas comparáveis item a item, com mínimo de cotações antes de escolher | Recebe só pedidos da sua área e das suas categorias |
| Aprovação do conselho registrada, com maioria simples acima do limite | Score e motivos explicam por que a oportunidade chegou |
| Fornecedores com documentos e certificações validados (NR-10, NR-35, bombeiros) | Reputação construída pelas avaliações |
| Endereço e contatos protegidos até a aprovação | Proposta estruturada, sem retrabalho de orçamento |

## Stack
React 18 · TypeScript · Vite · Tailwind · shadcn/ui · TanStack Query · React Router · React Hook Form + Zod · Supabase (Postgres, RLS, PostGIS, Auth, Storage, pg_cron) · Vitest · GitHub Actions · GitHub Pages

## Como rodar
```bash
npm install
cp .env.example .env.development.local   # preencha URL e chave do Supabase
npm run dev                              # http://127.0.0.1:5173
```
Passo a passo completo (Supabase local ou na nuvem): [docs/AMBIENTE-LOCAL.md](docs/AMBIENTE-LOCAL.md).

## Scripts
| Script | Faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checa tipos e gera `dist/` |
| `npm test` | Testes do front |
| `npm run lint` · `npm run typecheck` | Qualidade |
| `bash supabase/tests/rodar.sh` | Migrações + cenário de regras do banco (precisa de `DATABASE_URL`) |

## Documentação
- [Arquitetura, regras de negócio e segurança](docs/ARQUITETURA.md)
- [Configurações e ferramentas (GitHub, Supabase, admin)](docs/CONFIGURACAO.md)
- [Ambiente local](docs/AMBIENTE-LOCAL.md)
- [Roteiro de demonstração](docs/DEMONSTRACAO.md)
- [Roadmap](docs/ROADMAP.md)

## Projetos relacionados
- `facil-admin-gestao`: site do síndico profissional.
- `facil-admin-para-voce`: landing do marketplace (teste de interesse).

## Status
MVP pronto para piloto. Termos de Uso e Política de Privacidade são rascunhos para revisão jurídica.
