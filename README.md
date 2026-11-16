# FacilAdmin Plataforma

> **Estado em 16/11/2026:** `/demonstracao` funciona sem login e sem banco, com dados fictícios. O restante depende do backend, fora do ar no Supabase (issue #2). Critérios em [docs/MVP.md](docs/MVP.md).

**Problema e público:** síndicos e administradoras precisam pedir, comparar e aprovar serviços com prestação de contas; fornecedores de facilities precisam achar essas demandas na sua região.

## Estado e próximos passos (ciclo de 16/11/2026)

Site publicado: https://facil-admin-plataforma.vercel.app (`/demonstracao` responde 200 em 16/11/2026, com o código da `main`). Login e cadastro não funcionam enquanto o backend estiver fora do ar (#2). Critérios: **8 de 12 atendidos, Finalizado: não**, em [docs/MVP.md](docs/MVP.md): o LCP medido no site ficou em 2,79 s (meta: 2,5 s), e a correção é de código (#36).

**O que foi feito em 16/11/2026** (PR #39, entra na `developer/sprint-2026-11-19`)

- Destino depois do login validado: só caminhos do próprio app (`src/lib/destino.ts`, com teste), contra o aviso de redirecionamento aberto do React Router 6.
- `npm audit fix` sem versão maior; os 3 avisos restantes (react-router 6, zod 3) têm o risco decidido em [docs/adr/0001-alertas-react-router-zod.md](docs/adr/0001-alertas-react-router-zod.md).
- Playwright: o projeto "escuro" repetia o claro (o app não tem tema escuro) e virou "celular" (375 px), com teste de rolagem horizontal em 375 e 320 px.
- Lighthouse móvel no site, com o build da `main`: 7 execuções na `/demonstracao`, mediana 2,79 s.
- [docs/DEPLOY.md](docs/DEPLOY.md) com a Vercel e o Supabase; `.github/dependabot.yml` semanal; CI com Node 22.
- LCP (#36): a `/demonstracao` entra no bundle principal, sem `lazy`, e o `supabase-js` espera a primeira pintura. Lighthouse móvel local: mediana 2,89 → 2,45 s no Lighthouse 12.8.2, a versão da medida no site (folga de 0,05 s). Teste `e2e/primeira-carga.spec.ts` contra a volta do problema. A medida no site fica para depois do merge do #40.

**Alertas do Dependabot, 16/11/2026:** ligados pelo responsável; 18 abertos às 12:00. Os 3 de runtime (`react-router` 6, `zod` 3) seguem com a ADR 0001; os 15 de desenvolvimento só saem com o `vite` 6 e o `vitest` 4 (versão maior), na [#52](https://github.com/douglasabnovato/facil-admin-plataforma/issues/52).

**Ciclos anteriores** (já na `main`, PR #27): teste no navegador com axe (PR #32), medição com GoatCounter pronta (PR #32), telas logadas com erro, vazio e axe (PR #30), `/demonstracao` mais leve (PR #30).

**O que queremos fazer**

- [#2](https://github.com/douglasabnovato/facil-admin-plataforma/issues/2) Restaurar o backend da plataforma publicada (responsável; passo a passo na issue).
- [#52](https://github.com/douglasabnovato/facil-admin-plataforma/issues/52) Resolver os 15 alertas do Dependabot que restam (migrar `vite` e `vitest`, ou risco aceito em ADR pelo responsável).
- [#34](https://github.com/douglasabnovato/facil-admin-plataforma/issues/34) Ligar os alertas do Dependabot (feito pelo responsável em 16/11/2026; evidência comentada na issue).
- [#17](https://github.com/douglasabnovato/facil-admin-plataforma/issues/17) Criar a conta do GoatCounter e medir listas com 3 propostas (responsável).
- [#36](https://github.com/douglasabnovato/facil-admin-plataforma/issues/36) LCP da `/demonstracao`: correção mesclada na sprint (PR #41); falta medir no site depois do merge do #40 (#16, responsável).
- [#35](https://github.com/douglasabnovato/facil-admin-plataforma/issues/35) Migrar para React Router 7 e zod 4.
- [#38](https://github.com/douglasabnovato/facil-admin-plataforma/issues/38) Testar o cadastro no navegador com o backend simulado.
- [#28](https://github.com/douglasabnovato/facil-admin-plataforma/issues/28), [#29](https://github.com/douglasabnovato/facil-admin-plataforma/issues/29) e [#33](https://github.com/douglasabnovato/facil-admin-plataforma/issues/33) Contraste no navegador, telas de detalhe e fluxo real com Supabase local no CI.
- [#37](https://github.com/douglasabnovato/facil-admin-plataforma/issues/37) Reescrever o `CONFIGURACAO.md` para a Vercel.
- [#5](https://github.com/douglasabnovato/facil-admin-plataforma/issues/5) Medir o LCP das telas logadas (responsável, depende de #2).

**Onde está a documentação**

- [docs/MVP.md](docs/MVP.md): estado de cada critério, com evidência e data.
- [docs/PLANO-DE-ACAO.md](docs/PLANO-DE-ACAO.md): plano de cada ciclo, pesquisa e backlog.
- [docs/DEPLOY.md](docs/DEPLOY.md): publicação na Vercel e no Supabase, e o que é do responsável.
- [docs/adr/](docs/adr/): decisões de risco.

## Marketplace inteligente de Facilities para Condomínios

O **FacilAdmin Plataforma** é uma aplicação web criada para conectar condomínios, administradoras, síndicos, moradores e fornecedores especializados em serviços e produtos para gestão condominial.

A plataforma organiza o processo completo:

- identificação de necessidades do condomínio;
- criação de listas de serviços/produtos;
- busca inteligente de fornecedores compatíveis;
- recebimento de propostas estruturadas;
- comparação de valores;
- aprovação conforme regras internas;
- contratação;
- acompanhamento;
- avaliação da experiência.

O projeto foi desenvolvido pelo ecossistema **LearnTECH**, desde a concepção da solução, definição das regras de negócio, arquitetura, desenvolvimento do MVP e preparação para validação com usuários.

---

# Modelo de negócio

O FacilAdmin funciona como um marketplace verticalizado de facilities.

## Participantes

### Condomínio / Administradora

Responsável por:

- cadastrar necessidades;
- solicitar serviços ou produtos;
- receber propostas;
- aprovar contratações;
- avaliar fornecedores.

### Fornecedor

Responsável por:

- cadastrar serviços oferecidos;
- apresentar documentos e certificações;
- receber oportunidades compatíveis;
- enviar propostas;
- construir reputação através das avaliações.

---

# Fluxo principal da plataforma

```
Condomínio identifica necessidade
              |
              v
Criação de lista de necessidade
              |
              v
Sistema identifica fornecedores compatíveis
              |
              v
Fornecedores recebem oportunidade
              |
              v
Envio de propostas estruturadas
              |
              v
Comparação e aprovação
              |
              v
Contratação
              |
              v
Avaliação e histórico
```

---

# Principais problemas resolvidos

| Condomínio | Fornecedor |
|---|---|
| Centraliza demandas de manutenção e serviços | Recebe oportunidades qualificadas |
| Compara propostas estruturadas | Atua dentro da sua região e categoria |
| Possui histórico das contratações | Constrói reputação através das avaliações |
| Controla aprovações internas | Reduz esforço comercial |

---

# Diferenciais técnicos

A plataforma possui uma arquitetura preparada para:

- autenticação de usuários;
- controle de permissões;
- regras de acesso por perfil;
- segurança através de Row Level Security;
- localização geográfica;
- matching entre necessidade e fornecedor;
- histórico de propostas;
- fluxo de aprovação;
- avaliações.

---

# Stack tecnológica

## Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- React Hook Form
- Zod

## Backend / Plataforma

- Supabase
- PostgreSQL
- Supabase Auth
- Row Level Security (RLS)
- PostGIS
- Storage
- Functions / RPC

## Qualidade e desenvolvimento

- Vitest
- ESLint
- TypeScript
- GitHub Actions

## Deploy

- Vercel (front)
- Supabase Cloud (banco, Auth e Storage)

---

# Estrutura do projeto

```
facil-admin-plataforma

├── src
│   ├── app            (rotas, layout, menu, páginas estáticas)
│   ├── features       (auth, organizacoes, fornecedores, necessidades,
│   │                   matching, propostas, contratacoes, painel,
│   │                   notificacoes, admin; cada uma com telas e api.ts)
│   ├── components     (Comuns, CamposEndereco, ui/ do shadcn)
│   ├── lib            (cliente Supabase, tipos, formatos, endereço)
│   └── test           (testes Vitest)
│
├── supabase
│   ├── migrations     (5 migrações: esquema, RLS, funções, categorias, storage/agenda)
│   └── tests          (ambiente.sql, cenario.py, rodar.sh)
│
├── .github           (workflows ci.yml, banco.yml, manter-ativo.yml; dependabot.yml)
│
├── e2e                (fluxo.spec.ts: Playwright + axe, desktop e celular)
│
├── docs
│   ├── adr/           (decisões de risco)
│   ├── AMBIENTE-LOCAL.md
│   ├── APRESENTACAO.md
│   ├── ARQUITETURA.md
│   ├── CONFIGURACAO.md
│   ├── DEMONSTRACAO.md
│   ├── DEPLOY.md
│   ├── MVP.md
│   ├── PLANO-DE-ACAO.md
│   ├── ROADMAP.md
│   └── SUPABASE.md
│
└── README.md
```

---

# Executando o projeto localmente

## Requisitos

- Node.js 22 ou mais novo (o CI usa o 22)
- npm
- Conta Supabase configurada

---

## Instalação

```bash
npm install
```

Criar arquivo de ambiente:

```bash
cp .env.example .env.development.local
```

Configurar:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_BASE=/
```

Executar:

```bash
npm run dev
```

Aplicação disponível em:

```
http://127.0.0.1:5173
```

---

# Scripts disponíveis

| Comando | Descrição |
|---|---|
| npm run dev | Executa ambiente desenvolvimento |
| npm run build | Valida projeto e gera produção |
| npm run preview | Visualiza build local |
| npm test | Executa testes |
| npm run test:e2e | Ponta a ponta no navegador (Playwright; antes, `npx playwright install chromium`) |
| npm run lint | Analisa padrões de código |
| npm run typecheck | Validação TypeScript |

---

# Banco de dados e dados demonstrativos

O projeto utiliza Supabase como plataforma backend.

Durante o desenvolvimento foram criados cenários demonstrativos contendo:

- usuários com diferentes perfis;
- condomínios;
- fornecedores;
- categorias;
- documentos;
- listas de necessidades;
- propostas;
- contratos;
- avaliações.

Esses dados permitem apresentar os principais fluxos da aplicação sem necessidade de cadastro manual durante demonstrações.

Detalhes da estrutura e regras estão documentados em:

- `docs/SUPABASE.md`
- `docs/ARQUITETURA.md`
- `docs/DEMONSTRACAO.md`

---

# Documentação do projeto

A documentação foi separada por responsabilidade:

## Arquitetura

Define:

- visão técnica;
- banco de dados;
- regras de negócio;
- segurança.

Arquivo:

```
docs/ARQUITETURA.md
```

---

## Configuração

Documenta:

- ferramentas;
- ambientes;
- integrações;
- configurações necessárias.

Arquivo:

```
docs/CONFIGURACAO.md
```

---

## Ambiente local

Guia para instalação e execução.

Arquivo:

```
docs/AMBIENTE-LOCAL.md
```

---

## Demonstração

Roteiro estratégico para apresentação da plataforma.

Arquivo:

```
docs/DEMONSTRACAO.md
```

---

## Supabase

Documentação da camada de banco e backend.

Arquivo:

```
docs/SUPABASE.md
```

---

## Roadmap

Planejamento das próximas evoluções.

Arquivo:

```
docs/ROADMAP.md
```

---

# Deploy

O projeto está preparado para hospedagem utilizando:

## Frontend

Vercel: https://facil-admin-plataforma.vercel.app

## Backend

Supabase Cloud

Configurações de ambiente:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_BASE
```

---

# Status do projeto

## MVP desenvolvido

Funcionalidades implementadas:

✅ Autenticação  
✅ Perfis de usuários  
✅ Gestão de condomínios  
✅ Cadastro de fornecedores  
✅ Categorias de serviços/produtos  
✅ Listas de necessidades  
✅ Propostas  
✅ Contratações  
✅ Aprovações  
✅ Avaliações  
✅ Notificações  
✅ Regras de segurança no banco  

---

# Próximos passos

Evoluções planejadas:

- melhoria do algoritmo de matching;
- dashboards administrativos;
- notificações avançadas;
- integração financeira;
- expansão do marketplace;
- preparação para piloto com usuários reais.

---

# Projeto

**FacilAdmin Plataforma**

Marketplace de Facilities para Condomínios.

Desenvolvido pelo ecossistema:

**LearnTECH**

## Próximos passos do responsável

- Restaurar o projeto no Supabase, ou criar outro, e preencher as variáveis do site e dos workflows.

Acompanhamento na issue #2.
