# Plano: **PlanFin** — Sistema de Planejamento Financeiro Mensal

## Contexto

Hoje o Wesley organiza sua previsão financeira mensal em uma planilha Excel ("Análise Orçamentária.xlsx"). O fluxo central é: dividir o mês em **2 períodos** (alinhados com 2 salários — dia 1 e dia 20), listar despesas por período, registrar pagamentos, e calcular o saldo que sobra para o próximo período/mês. O sistema proposto substitui a planilha por uma aplicação web com PostgreSQL, automatizando despesas recorrentes e oferecendo gráficos de acompanhamento.

---

## Stack Tecnológica

- **Next.js 14+** (App Router) + TypeScript
- **PostgreSQL** + **Prisma ORM**
- **NextAuth.js v5** (autenticação com credentials provider)
- **Tailwind CSS** + **shadcn/ui**
- **Recharts** (gráficos)
- **TanStack Query** (gerenciamento de estado client-side)
- Deploy: **Render** (web service + PostgreSQL)

---

## Banco de Dados (Prisma Schema)

### Tabelas principais:

1. **User** — usuário do sistema (id, name, email, password hash). NextAuth gerencia sessão.
1. **Settings** — configurações globais (dia_salario_1, dia_salario_2)
2. **Category** — categorias de despesa (Cartões, Contas Fixas, Família, Obra, Outros) com cor para gráficos
3. **RecurringExpense** — templates de despesas recorrentes (descrição, categoria, valor padrão, período 1 ou 2, flag `isVariable` para cartões de crédito)
4. **IncomeSource** — fontes de receita fixa (Salário CVC, Salário Mentor) com período
5. **Receivable** — valores a receber parcelados (devedor, valor parcela, total/pagas)
6. **MonthlyPlan** — plano mensal (ano, mês, dias de corte, saldo inicial, status)
7. **PlanExpense** — despesas do plano (link ao plano, período, descrição, data, valor planejado, valor pago, categoria, link opcional a RecurringExpense)
8. **PlanIncome** — receitas do plano (link ao plano, período, descrição, valor esperado, valor recebido, link a IncomeSource ou Receivable)

**Regra chave**: `restante = valor_planejado - valor_pago` é sempre calculado, nunca armazenado.

---

## Telas e Funcionalidades

### 1. Dashboard (`/`)
- Resumo do mês atual: receita total vs despesa total, saldo
- Mini-resumo Período 1 vs Período 2
- Próximas despesas a vencer (7 dias)
- Gráfico de evolução do saldo (últimos 6 meses)

### 2. Planejamento Mensal (`/planejamento/[ano]/[mes]`) — **Tela principal**
- **Duas colunas lado a lado** (desktop) ou **abas** (mobile):
  - Período 1 (ex: "01 a 20") | Período 2 (ex: "21 a 31")
- Cada período mostra:
  - Tabela de despesas: Descrição | Data | Valor | Valor Pago | Restante
  - Edição inline (clique para editar valores)
  - Botão "Pagar" (marca Valor Pago = Valor com 1 clique)
  - Botão "Adicionar Despesa" para itens avulsos
  - Cartões de crédito com indicador visual (lembrete: "somar fatura atual com recorrentes")
- Seção de receitas abaixo:
  - Saldo Anterior (automático do mês anterior)
  - Entradas de salário + recebíveis
  - TOTAL e DIFERENÇA
- Navegação por mês (setas ← →)
- Botão **"Gerar Mês"**: cria o plano preenchendo automaticamente despesas recorrentes e receitas

### 3. Despesas Recorrentes (`/despesas-recorrentes`)
- CRUD das despesas que se repetem todo mês
- Colunas: Descrição | Categoria | Valor Padrão | Período | Variável? | Ativo?
- Despesas variáveis (cartões) são destacadas para lembrar de atualizar o valor

### 4. Receitas (`/receitas`)
- Fontes de renda fixa (salários): nome, valor padrão, período
- Recebíveis parcelados: devedor, valor parcela, total/pagas, ativo
- CRUD completo

### 5. Categorias (`/categorias`)
- CRUD simples com seletor de cor

### 6. Relatórios (`/relatorios`)
- Gastos por categoria (barras empilhadas)
- Evolução do saldo ao longo dos meses (linha)
- Comparação Período 1 vs Período 2 (barras agrupadas)
- Tabela resumo mês a mês

### 7. Configurações (`/configuracoes`)
- Dias padrão de corte dos períodos (dia 1 e dia 20, editáveis)
- Exportar dados (CSV)

---

## Lógica de Automação

### Gerar Mês Novo:
1. Busca dias de corte padrão nas Settings
2. Calcula saldo inicial = saldo final do mês anterior
3. Cria registro MonthlyPlan
4. Para cada RecurringExpense ativa → cria PlanExpense com valor padrão
5. Para cada IncomeSource **fixa** ativa (salários) → cria PlanIncome automaticamente
6. Para cada Receivable ativo com parcelas pendentes → cria PlanIncome com descrição "Fulano (X/Y)"
7. **Entradas extras** (Fernanda, Mãe, Kaick, 13°, Férias, etc.) → **NÃO são auto-preenchidas**. O usuário adiciona manualmente via botão "Adicionar Entrada" quando souber que vai receber naquele mês

### Cálculo de Saldo por Período:
```
Período 1:
  saldo_entrada = saldo_anterior (do mês passado)
  total_despesas = Σ(valor_planejado - valor_pago) de cada despesa P1
  total_receitas = saldo_entrada + Σ receitas P1
  diferença = total_receitas - total_despesas

Período 2:
  saldo_entrada = diferença do Período 1
  total_despesas = Σ(valor_planejado - valor_pago) de cada despesa P2
  total_receitas = saldo_entrada + Σ receitas P2
  saldo_final = total_receitas - total_despesas → vira saldo_anterior do próximo mês
```

---

## Estrutura de Pastas

```
financas/
├── prisma/
│   ├── schema.prisma          # Schema completo
│   └── seed.ts                # Categorias padrão + settings
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Layout raiz
│   │   ├── page.tsx           # Dashboard
│   │   ├── planejamento/[ano]/[mes]/page.tsx
│   │   ├── despesas-recorrentes/page.tsx
│   │   ├── receitas/page.tsx
│   │   ├── categorias/page.tsx
│   │   ├── relatorios/page.tsx
│   │   ├── configuracoes/page.tsx
│   │   └── api/               # Rotas de API (plans, expenses, incomes, etc.)
│   ├── components/
│   │   ├── ui/                # shadcn/ui
│   │   ├── layout/            # Header, Sidebar, MainLayout
│   │   ├── plan/              # PeriodPanel, ExpenseTable, IncomeSection, PeriodSummary
│   │   ├── reports/           # Componentes de gráficos
│   │   └── shared/            # CurrencyInput, MonthSelector, ConfirmDialog
│   ├── lib/
│   │   ├── prisma.ts          # Client singleton
│   │   ├── auth.ts            # Configuração NextAuth.js v5
│   │   ├── calculations.ts    # Lógica de saldo e totais
│   │   ├── plan-generator.ts  # Auto-populate de mês novo
│   │   └── format.ts          # Formatação R$ e datas pt-BR
│   ├── hooks/                 # usePlan, useExpenses, useIncomes
│   └── types/                 # Interfaces TypeScript
└── render.yaml                # Config de deploy
```

---

## Abordagem de UI/UX

Todas as telas serão construídas usando o skill **frontend-design** para garantir:
- Design visual profissional e diferenciado (não genérico)
- Componentes consistentes e bem estilizados
- Experiência de uso fluida (edição inline, feedback visual, transições)
- Responsividade (desktop e mobile)

---

## Ordem de Implementação

### Fase 1: Fundação
1. Inicializar Next.js + Tailwind + shadcn/ui + Prisma
2. Definir schema Prisma completo (incluindo User) e rodar migrations
3. Configurar NextAuth.js v5 com credentials provider (email/senha)
4. Criar página de login e registro
5. Seed com categorias, settings padrão e usuário admin
6. Layout principal (Sidebar + Header) com sessão do usuário

### Fase 2: Cadastros
5. CRUD de Categorias
6. CRUD de Despesas Recorrentes
7. CRUD de Fontes de Receita
8. CRUD de Recebíveis

### Fase 3: Planejamento (core)
9. API de geração de mês + rotas CRUD de plano/despesas/receitas
10. Tela de planejamento mensal com os 2 períodos
11. Edição inline + marcar como pago
12. Cálculo de saldos e carry-over entre meses

### Fase 4: Dashboard e Relatórios
13. Dashboard com resumo e gráfico de evolução
14. Página de relatórios com gráficos por categoria e comparativo

### Fase 5: Deploy
15. Configuração Render (web service + PostgreSQL)
16. Responsividade mobile
17. Testes finais

---

## Verificação

- Criar despesas recorrentes baseadas na planilha real (Carro, Santander, Energia, etc.)
- Gerar mês de Março/2026 e comparar com a planilha
- Marcar algumas despesas como pagas e verificar cálculo de saldo
- Navegar entre meses e verificar carry-over do saldo
- Verificar gráficos com dados de múltiplos meses
- Testar no celular (layout responsivo)
- Deploy no Render e acessar via URL externa
