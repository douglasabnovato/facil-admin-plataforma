# FacilAdmin — Plataforma

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

- Vercel

---

# Estrutura do projeto

```
facil-admin-plataforma

├── src
│   ├── components
│   ├── pages
│   ├── services
│   ├── hooks
│   └── integrations
│
├── supabase
│   ├── migrations
│   ├── functions
│   └── tests
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
http://localhost:5173
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

Vercel

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