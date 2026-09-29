# Configurações e ferramentas — o que você precisa fazer

> Nomes padrão: **faciladmin**. Se precisar de um segundo nome (outro projeto ou serviço), use **faciladmin-atendimento**.
> Os valores `douglasabnovato` abaixo seguem o dono dos repositórios atuais; troque se publicar em outra conta.

## 1. Ferramentas no computador
- [ ] Node.js 20 LTS — `node --version`
- [ ] Git + Git Bash
- [ ] VS Code (o repositório sugere ESLint, Tailwind CSS IntelliSense e Prettier ao abrir)
- [ ] (Opcional) Docker Desktop, para o Supabase local (ambiente de desenvolvimento sem gastar projeto na nuvem)
- [ ] (Opcional) Python 3 + `psql`, para rodar o teste de regras do banco localmente (o CI já roda)

## 2. GitHub
- [ ] Criar o repositório **público** `facil-admin-plataforma` (GitHub Pages gratuito exige público; o código não tem segredos).
- [ ] Settings → Pages → Source: **GitHub Actions**.
- [ ] Settings → Branches → proteger a `main` (PR obrigatório, CI verde).
- [ ] Settings → Secrets and variables → Actions:
  - **Variables:**
    - `VITE_SUPABASE_URL` (URL do projeto)
    - `VITE_SUPABASE_PUBLISHABLE_KEY` (chave pública)
  - **Secrets** (usados só pelo workflow manual "Aplicar migrações"):
    - `SUPABASE_ACCESS_TOKEN`
    - `SUPABASE_PROJECT_REF`
    - `SUPABASE_DB_PASSWORD`
- Workflows que já vêm no repositório:

| Workflow | Quando roda | O que faz |
|---|---|---|
| `ci.yml` | push e PR | Lint, tipos, testes, build e o cenário de regras do banco num PostGIS |
| `deploy.yml` | push na `main` | Build com `VITE_BASE=/facil-admin-plataforma/` e publicação no Pages com `404.html` |
| `banco.yml` | manual | `supabase db push` no projeto de produção |
| `manter-ativo.yml` | segundas 12:17 UTC | Consulta leve para o Supabase free não pausar |

## 3. Supabase (produção)
- [ ] Criar o projeto **`faciladmin`** (região São Paulo) e guardar a senha do banco num gerenciador de senhas.
- [ ] Limite de projetos gratuitos: com a Volta Express você pode já ter 2 ativos. Nesse caso use o **Supabase local** para desenvolvimento (docs/AMBIENTE-LOCAL.md).
- [ ] Aplicar as migrações (escolha uma forma):
  - Pelo terminal: `npx supabase login` → `npx supabase link --project-ref SEU_REF` → `npx supabase db push`
  - Pelo GitHub: Actions → **Aplicar migrações** → Run workflow (depois de cadastrar os secrets)
- [ ] Authentication → Providers → Email: ligado; **Confirm email** ligado.
- [ ] Authentication → URL Configuration:
  - Site URL: `https://douglasabnovato.github.io/facil-admin-plataforma/`
  - Redirect URLs:
    - `https://douglasabnovato.github.io/facil-admin-plataforma/**`
    - `http://127.0.0.1:5173/**`
- [ ] Storage: os buckets `documentos`, `fotos-necessidades` e `avatares` são criados pela migração 05. Confira em Storage.
- [ ] Database → Cron: confira o job `faciladmin-expirar` (criado pela migração 05).
- [ ] Project Settings → API: copie a URL e a chave pública (publishable/anon) para as Variables do GitHub.
- [ ] Account → Access Tokens: gere o `SUPABASE_ACCESS_TOKEN` (só se for usar o workflow de migrações).

### Tornar você administrador
Depois de criar a sua conta pela tela de cadastro, rode no SQL Editor:
```sql
UPDATE public.perfis SET is_admin = true
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'SEU-EMAIL');
```
O menu **Admin** aparece no próximo login. Por ele você revisa documentos, verifica fornecedores e cadastra categorias.

## 4. E-mail
- O Supabase envia os e-mails de confirmação e de nova senha com o servidor padrão, que tem limite baixo por hora. Serve para o piloto.
- Fase 2 (quando houver domínio próprio):
  - [ ] criar conta no Resend;
  - [ ] verificar o domínio;
  - [ ] em Authentication → SMTP Settings, usar o SMTP do Resend.

## 5. Endereços e coordenadas
- Nada a contratar. BrasilAPI/ViaCEP (CEP) e Nominatim/OSM (coordenadas) são gratuitos e chamados do navegador no cadastro de condomínio e fornecedor.
- Regra de uso do Nominatim: poucas requisições por vez. O app só consulta ao sair do campo CEP ou ao clicar em "Localizar no mapa".

## 6. Landing do síndico (`facil-admin-gestao`) e marketplace (`facil-admin-para-voce`)
- [ ] Apontar os botões "Entrar" e "Cadastrar" para:
  - `https://douglasabnovato.github.io/facil-admin-plataforma/entrar`
  - `https://douglasabnovato.github.io/facil-admin-plataforma/cadastro?tipo=fornecedor` (ou `?tipo=gestor`, `?tipo=condomino`)
- [ ] Formspree: criar um formulário só para a página `/plataforma` (leads separados).
- [ ] Informar os links de LinkedIn, Instagram e WhatsApp.
- [ ] Confirmar quais depoimentos são reais e autorizados.

## 7. Jurídico e LGPD (antes do piloto)
- [ ] Definir o e-mail de contato de privacidade.
- [ ] Revisar os rascunhos de Termos de Uso e Política de Privacidade (`src/app/Paginas.tsx`, rotas `/termos` e `/privacidade`). Recomendo revisão jurídica.
- [ ] Confirmar as certificações exigidas por categoria (migração 04; editáveis no Admin).

## 8. Rotina
- [ ] Revisar a fila de documentos no **Admin** (você recebe notificação a cada envio).
- [ ] O Supabase free pausa após 7 dias sem uso: o `manter-ativo.yml` cuida disso.
