# PlanFin — Sistema de Planejamento Financeiro Mensal

## Visao Geral
Aplicacao web que substitui planilha Excel de orcamento mensal. Divide o mes em N periodos (configuravel por usuario, sem limite rigido), lista despesas por periodo, registra pagamentos e calcula saldo.

## Stack
- **Next.js 16** (App Router) + TypeScript
- **PostgreSQL** + **Prisma ORM 6**
- **NextAuth.js v5** (credentials provider — email/senha)
- **Tailwind CSS 4** + **shadcn/ui** (estilo New York, cor base Slate)
- **Recharts** (graficos)
- **TanStack Query 5** (estado client-side)
- **React Hook Form** + **Zod** (formularios e validacao)
- Deploy: **Render**

## Comandos
```bash
npm run dev              # Dev server (porta 3000)
npm run build            # Build (roda prisma generate antes)
npm run lint             # ESLint
npm run db:migrate       # Prisma migrations
npm run db:seed          # Seed (admin + categorias padrao)
npm run db:reset         # Reset do banco
npm run db:studio        # Prisma Studio GUI

# Docker (banco local)
docker compose up -d     # Sobe PostgreSQL na porta 5432
docker compose down      # Para o banco
```

## Variaveis de Ambiente
```
DATABASE_URL=postgresql://planfin:planfin@localhost:5438/planfin
NEXTAUTH_SECRET=<gerar com openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

## Estrutura de Pastas
```
prisma/
  schema.prisma          # Schema completo (9 models)
  seed.ts                # Seed: usuario admin + categorias
src/
  app/
    layout.tsx           # Layout raiz
    login/page.tsx       # Login
    register/page.tsx    # Registro
    (app)/               # Rotas protegidas (grupo)
      layout.tsx         # Layout com sidebar/header
      page.tsx           # Dashboard
      planejamento/[ano]/[mes]/page.tsx  # Tela principal
      despesas-recorrentes/page.tsx
      receitas/page.tsx
      categorias/page.tsx
      relatorios/page.tsx
      configuracoes/page.tsx
    api/                 # REST API routes
      auth/              # NextAuth + registro
      categories/        # CRUD categorias
      recurring-expenses/# CRUD despesas recorrentes
      income-sources/    # CRUD fontes receita
      receivables/       # CRUD recebiveis
      plans/             # Planos mensais + expenses/incomes/generate
      dashboard/         # Dados do dashboard
      reports/           # Dados de relatorios
      settings/          # Configuracoes
      export/            # Export CSV
  components/
    ui/                  # shadcn/ui (17 componentes)
    layout/              # Header, Sidebar, MainLayout
    plan/                # PeriodPanel, PeriodSummary, dialogs
    reports/             # BalanceChart
    shared/              # CurrencyInput, ConfirmDialog, PageHeader
    providers.tsx        # NextAuth + ReactQuery + Toaster
  lib/
    prisma.ts            # Prisma client singleton
    auth.ts              # Config NextAuth
    calculations.ts      # Logica de saldo e totais
    plan-generator.ts    # Auto-gerar plano mensal
    periods.ts           # Helper de labels e ranges de periodos
    format.ts            # Formatacao R$ e datas pt-BR
    api-utils.ts         # Helpers de response API
    utils.ts             # cn() para classNames
  types/
    next-auth.d.ts       # Type augmentation
  middleware.ts          # Protecao de rotas
```

## Banco de Dados — Models Prisma
- **User** — usuario (email unico, senha hash com bcryptjs)
- **Settings** — periodCount (sem limite, default 2), periodDays Int[] (default [1,20])
- **Category** — nome, cor hex, ordem (unique por user+nome)
- **RecurringExpense** — template recorrente (periodo 1 a N, isVariable para cartoes)
- **IncomeSource** — receita fixa (salarios)
- **Receivable** — recebiveis parcelados (devedor, parcelas)
- **MonthlyPlan** — plano mensal (unique por user+ano+mes, cutDays Int[] define periodos)
- **PlanExpense** — despesa do plano (plannedAmount, paidAmount; restante = planned - paid)
- **PlanIncome** — receita do plano (expectedAmount, receivedAmount)

## Logica de Negocio
- **N periodos por mes** (sem limite rigido): configuravel via Settings.periodCount e Settings.periodDays
- Cada periodo vai de cutDays[i] ate cutDays[i+1]-1 (ultimo vai ate fim do mes)
- **Gerar mes**: cria MonthlyPlan + popula PlanExpense de RecurringExpense + PlanIncome de IncomeSource/Receivable
- **Saldo**: encadeado — saldo de cada periodo = entrada + receitas - despesas, passa como entrada do proximo
- **restante** = plannedAmount - paidAmount (sempre calculado, nunca armazenado)
- **Ao reduzir periodos**: itens com period > novoPeriodCount sao reclassificados para o ultimo periodo

## Convencoes
- Locale: pt-BR (moeda R$, datas dd/MM/yyyy)
- Banco usa snake_case (via @map), codigo usa camelCase
- API RESTful: GET/POST em route.ts, GET/PUT/DELETE em [id]/route.ts
- Todas as rotas API verificam sessao do usuario (getServerSession)
- UI construida com skill frontend-design para design profissional

## Fases de Implementacao
- [x] Fase 1: Fundacao (Next.js, Prisma schema, NextAuth, login/registro, seed, layout)
- [ ] Fase 2: Cadastros (CRUD categorias, despesas recorrentes, receitas, recebiveis)
- [ ] Fase 3: Planejamento core (gerar mes, tela 2 periodos, edicao inline, saldos)
- [ ] Fase 4: Dashboard e Relatorios (graficos, resumos)
- [ ] Fase 5: Deploy (Render, responsividade, testes)
