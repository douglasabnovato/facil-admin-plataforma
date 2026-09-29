# Ambiente local — passo a passo

## Opção A — Supabase local (recomendado para desenvolver; precisa do Docker Desktop)
1. Instalar as dependências (na pasta do projeto, Git Bash):
   ```bash
   cd /c/ambiente-projeto/faciladm/facil-admin-plataforma
   npm install
   ```
2. Inicializar a configuração do Supabase (uma vez; cria `supabase/config.toml` sem mexer nas migrações):
   ```bash
   npx supabase init
   ```
   Se perguntar sobre VS Code/Deno, pode responder **N**.
3. Subir o Supabase local (a primeira vez baixa as imagens e demora alguns minutos):
   ```bash
   npx supabase start
   ```
   Anote na saída a **API URL** (`http://127.0.0.1:54321`), a **anon key** ou **publishable key** e o **Studio URL** (`http://127.0.0.1:54323`).
4. Aplicar as migrações do zero:
   ```bash
   npx supabase db reset
   ```
5. Criar o `.env.development.local` a partir do exemplo:
   ```bash
   cp .env.example .env.development.local
   ```
   Preencha `VITE_SUPABASE_URL=http://127.0.0.1:54321` e a chave do passo 3.
6. Rodar o front:
   ```bash
   npm run dev
   ```
   Abra `http://127.0.0.1:5173`.
7. E-mails de confirmação no local: abra o **Inbucket/Mailpit** (endereço na saída do `supabase start`, normalmente `http://127.0.0.1:54324`) e clique no link.
8. Para virar admin: Studio → SQL Editor → rode o `UPDATE` de docs/CONFIGURACAO.md (seção 3).

## Opção B — sem Docker (projeto na nuvem)
1. `npm install`
2. Crie o `.env.development.local` com a URL e a chave do projeto **faciladmin** (ou de um segundo projeto **faciladmin-atendimento**, se quiser separar dev de produção).
3. Aplique as migrações nesse projeto (`npx supabase link` + `npx supabase db push`).
4. Em Authentication → URL Configuration, inclua `http://127.0.0.1:5173/**`.
5. `npm run dev`

## Comandos do dia a dia
| Comando | Para quê |
|---|---|
| `npm run dev` | Front com recarga automática |
| `npm test` | Testes do front (Vitest) |
| `npm run lint` · `npm run typecheck` | Qualidade e tipos |
| `npm run build` · `npm run preview` | Build de produção e prévia local |
| `npx supabase db reset` | Recria o banco local com todas as migrações |
| `npx supabase migration new nome` | Nova migração (nunca edite uma migração já aplicada em produção) |
| `npx supabase stop` | Para os contêineres |

## Teste das regras do banco (opcional; o CI roda sempre)
Com o Supabase local ligado, o Postgres fica em `127.0.0.1:54322` (usuário e senha `postgres`):
```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres bash supabase/tests/rodar.sh
```
O script cria um banco separado (`faciladmin_teste`), aplica as migrações, roda 63 verificações e termina com `FALHAS: 0`. Precisa de `psql` e `python3` no PATH. Nunca aponte para produção.

## Problemas comuns
| Sintoma | Causa e solução |
|---|---|
| Tela "Configuração pendente" | Falta o `.env.development.local` ou o `npm run dev` não foi reiniciado |
| "E-mail ou senha incorretos" logo após cadastrar | O e-mail ainda não foi confirmado (veja o Inbucket/Mailpit ou a caixa de entrada) |
| Fornecedor não vê oportunidades | Precisa estar **verificado** (Admin), ter categorias, coordenadas ou a mesma cidade, e o documento exigido pela categoria aprovado |
| Síndico não vê propostas | O comparativo abre com o mínimo de propostas (padrão 3) ou no fim do prazo. O mínimo muda em Condomínio → Regras de compra |
| CEP não preenche | BrasilAPI/ViaCEP fora do ar ou CEP novo: preencha à mão e use "Localizar no mapa" |
