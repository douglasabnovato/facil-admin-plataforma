# FacilAdmin Plataforma

> **Estado em 09/11/2026:** `/demonstracao` funciona sem login e sem banco, com dados fictícios. O restante depende do backend, pausado no Supabase (issue #2). Critérios em [docs/MVP.md](docs/MVP.md).

## Estado e próximos passos (ciclo de 07/11/2026)

Site publicado: https://facil-admin-plataforma.vercel.app (HTTP 200 em `/demonstracao` em 09/11/2026). Login e cadastro não funcionam enquanto o backend estiver pausado (#2); use a [demonstração](https://facil-admin-plataforma.vercel.app/demonstracao).

**O que foi feito neste ciclo**

- A tela de necessidades mostra a falha ao carregar os condomínios, com "Tentar de novo", em vez de pedir para entrar num condomínio. Cinco testes novos da tela logada, com a API simulada (`src/test/listas.test.tsx`).
- O agendamento `Manter Supabase ativo` termina com aviso quando as Variables estão vazias, em vez de falhar toda semana (#19).
- O [docs/MVP.md](docs/MVP.md) tem uma tabela só, a atual; o critério 11 cita o cenário do banco que roda no CI.

**Antes (ciclo de 03/11):** demonstração sem backend, ordenação das propostas, LCP da `/demonstracao` com mediana de 2,36 s.

**O que queremos fazer**

- [#2](https://github.com/douglasabnovato/facil-admin-plataforma/issues/2) Restaurar o backend da plataforma publicada (responsável).
- [#5](https://github.com/douglasabnovato/facil-admin-plataforma/issues/5) Medir LCP e navegação por teclado nas telas logadas.
- [#16](https://github.com/douglasabnovato/facil-admin-plataforma/issues/16) Reduzir o LCP da `/demonstracao` para até 2,5 s.
- [#17](https://github.com/douglasabnovato/facil-admin-plataforma/issues/17) Medir listas com 3 propostas e o tempo até a escolha (responsável).
- [#18](https://github.com/douglasabnovato/facil-admin-plataforma/issues/18) Proteger a `main` com PR e CI obrigatórios (responsável).
- [#19](https://github.com/douglasabnovato/facil-admin-plataforma/issues/19) Conferir o aviso do agendamento depois do merge na `main`.
- [#24](https://github.com/douglasabnovato/facil-admin-plataforma/issues/24) Tratar erro e vazio nas demais telas logadas, com teste.
- [#25](https://github.com/douglasabnovato/facil-admin-plataforma/issues/25) Rodar o axe nas telas logadas com a API simulada.

**Onde está a documentação**

- [docs/MVP.md](docs/MVP.md): estado de cada critério, com evidência e data.
- [docs/PLANO-DE-ACAO.md](docs/PLANO-DE-ACAO.md): plano do ciclo, pesquisa e backlog.

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
├── .github/workflows  (ci.yml, banco.yml, manter-ativo.yml)
│
├── docs
│   ├── AMBIENTE-LOCAL.md
│   ├── APRESENTACAO.md
│   ├── ARQUITETURA.md
│   ├── CONFIGURACAO.md
│   ├── DEMONSTRACAO.md
│   ├── ROADMAP.md
│   └── SUPABASE.md
│
└── README.md
```

---

# Executando o projeto localmente

## Requisitos

- Node.js
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
