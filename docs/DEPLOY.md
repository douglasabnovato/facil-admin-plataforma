# Publicação (deploy)

Como o site vai ao ar hoje e o passo a passo do que só o responsável faz. Estado conferido em 16/11/2026.

## Visão geral

| Peça | Onde | Quem publica | Estado em 16/11/2026 |
|---|---|---|---|
| Front (React + Vite) | Vercel, projeto `facil-admin-plataforma` | A Vercel, a cada push na `main` (integração do GitHub) | No ar: https://facil-admin-plataforma.vercel.app responde 200; o deploy de produção é do commit `26a530f` (merge do PR #27) |
| Banco, Auth e Storage | Supabase Cloud | Workflow manual `Aplicar migrações` (`.github/workflows/banco.yml`) | Fora do ar: o endereço do build publicado não resolve no DNS (`curl` em `/auth/v1/health`, 16/11/2026: código 6). Ver #2 |
| Agendamento anti-pausa | GitHub Actions (`manter-ativo.yml`) | Toda segunda, 12:17 UTC | Termina com aviso enquanto as Variables estiverem vazias (#19) |

O GitHub Pages não é usado. O `docs/CONFIGURACAO.md` ainda cita endereços do Pages de antes da troca para a Vercel; vale este arquivo.

## Front na Vercel

Configuração no repositório: `vercel.json` (todas as rotas vão para `index.html`, por ser SPA). A Vercel detecta o Vite e usa `npm run build` e a pasta `dist`.

Variáveis de ambiente do build (nomes; os valores ficam só na Vercel):

| Nome | Valor | Onde |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL do Supabase | Vercel → Settings → Environment Variables (Production) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | chave **publishable** (nunca a `service_role`) | idem |
| `VITE_BASE` | `/` | idem (opcional; o padrão já é `/`) |

### Conferir o deploy (qualquer pessoa)

1. `gh api repos/douglasabnovato/facil-admin-plataforma/deployments?per_page=1 --jq '.[0].sha'` mostra o commit publicado em Production.
2. Comparar com `git rev-parse origin/main`.
3. `curl -s -o /dev/null -w "%{http_code}" https://facil-admin-plataforma.vercel.app/demonstracao` deve dar 200.

### Republicar depois de mudar variável (responsável)

1. Abrir https://vercel.com, projeto `facil-admin-plataforma`.
2. **Deployments** → no deploy mais recente da `main`, menu **⋯** → **Redeploy** → **Redeploy**.
3. Esperar o estado **Ready** e conferir o passo "Conferir o deploy" acima.

## Backend no Supabase (responsável, issue #2)

O passo a passo completo, com telas e botões, está na issue #2. Resumo:

1. https://supabase.com/dashboard/projects → projeto pausado → **Restore project**; ou **New project** `faciladmin`, região São Paulo, senha só com letras e números.
2. Projeto novo: criar os Secrets do Actions `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` e `SUPABASE_DB_PASSWORD` e rodar **Actions → Aplicar migrações → Run workflow**.
3. **Authentication → URL Configuration:** Site URL `https://facil-admin-plataforma.vercel.app` e Redirect URL `https://facil-admin-plataforma.vercel.app/**`.
4. **Project Settings → API:** copiar a Project URL e a chave publishable para as Variables do Actions e para a Vercel (tabela acima); fazer o Redeploy.
5. Conferir: **Actions → Manter Supabase ativo → Run workflow** termina com "Supabase respondeu", e o cadastro com e-mail fictício funciona no site.

## Medição de uso (responsável, issue #17)

O site já carrega o GoatCounter (`https://douglasabnovato.goatcounter.com/count`) só no build de produção. Falta criar a conta `douglasabnovato` em https://www.goatcounter.com/signup; o passo a passo está na issue #17.

## Alertas de segurança (responsável)

Os alertas do Dependabot estão desligados (a API responde 403). O `.github/dependabot.yml` só abre PRs de atualização; os alertas se ligam em **Settings → Code security → Dependabot alerts → Enable**. Passo a passo na issue "Ligar os alertas do Dependabot".
