# Rodar a FacilAdmin localmente com o Supabase na nuvem (sem Docker)

> O front roda no seu computador (`npm run dev`) e o banco fica num projeto Supabase gratuito na nuvem.
> Comandos para o **Git Bash**, na pasta do projeto.

## 1. Pré-requisitos
- [ ] **Node.js 20 LTS** instalado. Confira com `node --version` (deve mostrar v20 ou mais).
- [ ] Conta no **supabase.com** (pode entrar com o GitHub).
- [ ] Projeto gravado em `C:\ambiente-projeto\faciladm\facil-admin-plataforma`.

> **Limite do plano gratuito:** são 2 projetos ativos por conta. Se a Volta Express já usa os 2, pause um deles no painel (Project Settings → General → Pause project) ou use outra conta.

## 2. Instalar as dependências
```bash
cd /c/ambiente-projeto/faciladm/facil-admin-plataforma
npm install
```

## 3. Criar o projeto no Supabase
1. Acesse supabase.com → **New project**.
2. Preencha:
   - **Name:** `faciladmin`
   - **Database Password:** gere uma senha forte e **guarde no gerenciador de senhas** (vai ser pedida no passo 4)
   - **Region:** South America (São Paulo)
3. Clique em **Create new project** e espere de 1 a 2 minutos até o painel ficar pronto.
4. Anote o **Project REF**. Ele aparece na URL do painel:
   `https://supabase.com/dashboard/project/`**`SEU_REF`**

## 4. Aplicar as migrações (criar tabelas, regras e categorias)
```bash
npx supabase login
```
> Abre o navegador para autorizar. Confirme e volte ao terminal.

```bash
npx supabase link --project-ref SEU_REF
```
> Pede a **senha do banco** do passo 3.

```bash
npx supabase db push
```
> Lista as 5 migrações e pergunta se deve aplicar: responda **Y**.
> O fim esperado é "Finished supabase db push".

**Conferir:** no painel → **Table Editor** → tabela `categorias` → devem aparecer **20 linhas**.
Em **Storage**, devem existir os buckets `documentos`, `fotos-necessidades` e `avatares`.

## 5. Configurar o login (Auth)
No painel → **Authentication**:

1. **URL Configuration**
   - **Site URL:** `http://127.0.0.1:5173`
   - **Redirect URLs** → Add URL: `http://127.0.0.1:5173/**`
   - Salve.
2. **Sign In / Providers → Email**
   - **Enable Email provider:** ligado.
   - **Confirm email:**
     - *ligado* (padrão): cada cadastro precisa clicar no link do e-mail. Use e-mails **reais**. O envio gratuito é limitado a poucos e-mails por hora.
     - *desligado* (recomendado **só enquanto testa**): o cadastro entra direto e permite e-mails inventados (`fornecedor@teste.com`). **Religue antes de publicar.**

## 6. Copiar URL e chave pública
No painel → **Project Settings → API Keys** (ou **Data API**):
- **Project URL:** `https://SEU_REF.supabase.co`
- **Publishable key** (`sb_publishable_...`). Em projetos antigos, use a **anon public** (`eyJ...`).

> ⚠️ **Nunca** use a `service_role` / `secret key` no front nem a coloque em arquivo versionado.

## 7. Criar o arquivo de ambiente
```bash
cp .env.example .env.development.local
```
Abra `.env.development.local` no VS Code e preencha:
```
VITE_SUPABASE_URL=https://SEU_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_cole_aqui
VITE_BASE=/
```
> Esse arquivo é ignorado pelo Git (`.gitignore`). Não versione.

## 8. Rodar o front
```bash
npm run dev
```
Abra **http://127.0.0.1:5173**

## 9. Criar a sua conta e virar admin
1. No app → **Cadastre-se** → escolha **"Síndico ou administradora"** → crie a conta.
   - Com **Confirm email** ligado, confirme pelo link recebido e depois entre.
2. No painel do Supabase → **SQL Editor** → **New query** → rode (troque pelo seu e-mail):
```sql
   UPDATE public.perfis SET is_admin = true
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com');
```
3. No app, **saia e entre de novo**. O menu **Admin** aparece.

## 10. Testar o fluxo completo
Siga `docs/DEMONSTRACAO.md`, usando uma **janela anônima** ou outro navegador para cada pessoa:

| Conta | Tipo no cadastro | Papel no teste |
|---|---|---|
| Você | Síndico ou administradora | Síndico e admin |
| Conselheiro | Morador | Aprovado como conselheiro |
| Morador | Morador | Sugestões e lista da unidade |
| Fornecedor | Fornecedor | Cadastro, documentos e propostas |

Resumo do fluxo:
1. **Síndico:** cadastra o condomínio e copia o código de convite. Para testar com uma proposta só, muda o mínimo para **1** em Regras de compra.
2. **Morador e conselheiro:** Condomínios → **Tenho um código**. O síndico aprova em Membros.
3. **Fornecedor:** Meu cadastro → dados, CEP, raio, categorias e documentos (qualquer PDF).
4. **Admin (você):** Admin → aprova os documentos → Fornecedores → marca **Verificado**.
5. **Síndico:** publica uma lista. **Fornecedor:** envia a proposta. **Síndico:** escolhe. **Conselheiro:** aprova se o valor passar de R$ 5.000.
6. Contatos liberados → conclusão → avaliação dos dois lados.

## Rotina do dia a dia
```bash
cd /c/ambiente-projeto/faciladm/facil-admin-plataforma
npm run dev
```
O banco fica sempre na nuvem; não há nada para ligar ou desligar.

| Quero… | Como |
|---|---|
| Aplicar uma migração nova | `npx supabase migration new nome` → escrever o SQL → `npx supabase db push` |
| Ver ou editar dados | Painel → Table Editor ou SQL Editor |
| Rodar os testes do front | `npm test` |
| Checar a qualidade | `npm run lint` e `npm run typecheck` |

> **Pausa automática:** o projeto gratuito pausa depois de 7 dias sem uso. Para reativar: painel → **Restore project**. Depois do deploy, o workflow `manter-ativo.yml` evita a pausa.

## Problemas comuns
| Sintoma | Solução |
|---|---|
| `supabase link` recusa a senha | Use a senha do banco do passo 3. Se perdeu: Project Settings → Database → **Reset database password** |
| O app mostra "Configuração pendente" | Falta o `.env.development.local` ou há erro na URL/chave. Salve o arquivo e reinicie o `npm run dev` |
| "E-mail ou senha incorretos" logo após cadastrar | O e-mail não foi confirmado. Clique no link do e-mail ou desligue **Confirm email** durante os testes |
| "Muitas tentativas" / e-mail não chega | Limite de envio do plano gratuito. Espere cerca de 1 hora ou desligue **Confirm email** nos testes |
| O link do e-mail abre uma página inexistente | Revise o **Site URL** e as **Redirect URLs** do passo 5 |
| O menu Admin não aparece | Confira o e-mail no `UPDATE` do passo 9, saia e entre de novo |
| O fornecedor não vê oportunidades | Três causas possíveis:<br>• ainda não foi marcado como **Verificado** no Admin;<br>• está fora do raio do condomínio;<br>• falta a NR-10 aprovada para a categoria de elétrica |
| O CEP não preenche o endereço | A API de CEP está fora do ar. Preencha à mão e clique em **Localizar no mapa** |
| Erro ao enviar documento | Confira se os buckets existem em Storage. Se não existirem, rode `npx supabase db push` de novo |