# Análise Completa do PlanFin — Melhorias e Ajustes

3 agentes analisaram o projeto em paralelo: Backend (APIs + lógica), Frontend (UI + UX), Infraestrutura (deps + config + schema).

---

## BUGS REAIS (corrigir)

### 1. Recebíveis nunca avançam parcela
O `paidInstall` do Receivable nunca é incrementado. Quando gera o plano do mês seguinte, mostra a mesma parcela de novo.
- **Arquivo**: `src/lib/plan-generator.ts` (linha ~155)
- **Fix**: Incrementar `paidInstall` quando `PlanIncome.receivedAmount >= expectedAmount`, ou adicionar endpoint dedicado

### 2. Data inválida ao gerar despesa com dueDay=31 em meses curtos
Se `RecurringExpense.dueDay = 31` e o mês é Fevereiro, gera `Date(2026, 1, 31)` → vira 3 de Março.
- **Arquivo**: `src/lib/plan-generator.ts` (linha ~114)
- **Fix**: Usar `Math.min(dueDay, daysInMonth)` como já faz no `adjustDate`

### 3. Categoria duplicada retorna erro 500
A unique constraint `(userId, name)` é violada silenciosamente, retornando "Erro interno" ao invés de "Categoria já existe".
- **Arquivo**: `src/app/api/categories/route.ts`
- **Fix**: Catch `PrismaClientKnownRequestError` code P2002

---

## VALIDAÇÕES FALTANDO (adicionar)

### 4. Período fora do range aceito em vários endpoints
Não valida se `period` está entre 1 e `periodCount` nos endpoints:
- `POST /api/plans/expenses` e `POST /api/plans/incomes`
- `POST /api/recurring-expenses` e `POST /api/income-sources`
- `PUT /api/plans/expenses/[id]` e `PUT /api/plans/incomes/[id]`

### 5. Validação de Settings incompleta
`PUT /api/settings` não valida que `periodDays[0] === 1` (frontend impede, mas API deveria validar).

---

## PÁGINAS ESSENCIAIS FALTANDO

### 6. Sem error boundary, 404 e loading skeletons
- Criar `src/app/error.tsx` — erro global
- Criar `src/app/not-found.tsx` — página 404
- Criar `src/app/(app)/loading.tsx` — skeleton durante carregamento

---

## MELHORIAS DE UX

### 7. Relatórios não mostram Saldo Real
A página de relatórios (`relatorios/page.tsx`) usa apenas valores projetados. O dashboard já mostra real+projetado — os relatórios deveriam fazer o mesmo.
- **Arquivo**: `src/app/api/reports/route.ts` + `src/app/(app)/relatorios/page.tsx`

### 8. Tab mobile do planejamento mostra "P1", "P2"
Muito curto — deveria mostrar pelo menos "Per. 1" ou o range de dias.
- **Arquivo**: `src/app/(app)/planejamento/[ano]/[mes]/page.tsx` (linha ~419)

### 9. Deleção de categoria sem avisar se está em uso
Permite deletar categoria que tem despesas vinculadas. Deveria avisar quantas despesas ficam sem categoria.
- **Arquivo**: `src/app/api/categories/[id]/route.ts`

---

## INFRAESTRUTURA / CONFIG

### 10. next.config.ts vazio — sem headers de segurança
- Adicionar headers: `X-Frame-Options`, `X-Content-Type-Options`
- Adicionar `optimizePackageImports` para performance

### 11. Float vs Decimal para valores monetários
Prisma usa `Float` para amounts — sujeito a erros de ponto flutuante. Para produção deveria usar `Decimal`.
- **Arquivos**: `prisma/schema.prisma` (todos os campos de valor)
- **Impacto**: Mudança grande, afeta todas as APIs e componentes. Avaliar se vale para o escopo atual.

### 12. CLAUDE.md desatualizado
- Fases de implementação precisam refletir o estado real (Fase 1-3 majoritariamente completas)
- Falta documentar: isFixed/dueDate, 3 modos de criação, saldo real vs projetado, banner de saldo

---

## CÓDIGO PARA SIMPLIFICAR

### 13. PeriodPanel muito grande (~550 linhas)
Candidato a split em sub-componentes: `ExpenseRow`, `ExpenseTable`, `MobileExpenseCard`.
- **Arquivo**: `src/components/plan/period-panel.tsx`

### 14. Duplicação mobile/desktop nos componentes de plano
`period-panel.tsx` e `income-section.tsx` têm o layout duplicado para mobile (cards) e desktop (table). Poderia usar `<MediaQuery>` ou reorganizar melhor.

---

## COISAS QUE NÃO FAZEM SENTIDO REMOVER

Após análise, **todas as rotas API estão em uso**, não há código morto significativo, e as dependências são todas justificadas (exceto `tw-animate-css` que pode ser redundante com Tailwind 4 mas não causa problemas).

---

## PRIORIZAÇÃO SUGERIDA

**Lote 1 — Bugs (crítico):**
- [ ] #1 Receivable paidInstall increment
- [ ] #2 Data inválida dueDay=31
- [ ] #3 Categoria duplicada erro 500

**Lote 2 — Páginas essenciais:**
- [ ] #6 error.tsx + not-found.tsx + loading.tsx

**Lote 3 — Validações:**
- [ ] #4 Validação de período nos endpoints
- [ ] #5 Validação de Settings

**Lote 4 — UX:**
- [ ] #7 Relatórios com saldo real
- [ ] #8 Tab mobile labels
- [ ] #9 Aviso ao deletar categoria em uso

**Lote 5 — Infra:**
- [ ] #10 Security headers
- [ ] #12 Atualizar CLAUDE.md

**Adiado (avaliar depois):**
- #11 Float→Decimal (mudança grande demais para agora)
- #13-14 Refactoring de componentes (funcional, não urgente)
