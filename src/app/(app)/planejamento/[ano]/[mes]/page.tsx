"use client"

import { use, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Wand2,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { PeriodPanel } from "@/components/plan/period-panel"
import { IncomeSection } from "@/components/plan/income-section"
import { PeriodSummary } from "@/components/plan/period-summary"
import { AddExpenseDialog } from "@/components/plan/add-expense-dialog"
import { AddIncomeDialog } from "@/components/plan/add-income-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { getMonthName } from "@/lib/format"
import { calcPeriodSummary } from "@/lib/calculations"
import { getPeriodLabel } from "@/lib/periods"

interface PlanExpense {
  id: string
  period: number
  description: string
  dueDate: string | null
  plannedAmount: number
  paidAmount: number
  categoryId: string | null
  recurringExpenseId: string | null
  category: { id: string; name: string; color: string } | null
}

interface PlanIncome {
  id: string
  period: number
  description: string
  expectedAmount: number
  receivedAmount: number
  incomeSourceId: string | null
  receivableId: string | null
}

interface MonthlyPlan {
  id: string
  year: number
  month: number
  cutDays: number[]
  initialBalance: number
  status: string
  expenses: PlanExpense[]
  incomes: PlanIncome[]
}

export default function PlanejamentoPage({
  params,
}: {
  params: Promise<{ ano: string; mes: string }>
}) {
  const { ano, mes } = use(params)
  const year = parseInt(ano)
  const month = parseInt(mes)
  const router = useRouter()
  const queryClient = useQueryClient()

  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [addExpensePeriod, setAddExpensePeriod] = useState(1)
  const [addIncomeOpen, setAddIncomeOpen] = useState(false)
  const [addIncomePeriod, setAddIncomePeriod] = useState(1)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: plan, isLoading } = useQuery<MonthlyPlan | null>({
    queryKey: ["plan", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/plans?year=${year}&month=${month}`)
      if (!res.ok) return null
      const data = await res.json()
      if (!data || !data.id) return null
      return data
    },
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao gerar plano")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      toast.success("Plano gerado com sucesso!")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!plan) return
      const res = await fetch(`/api/plans/${plan.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao excluir plano")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      setDeleteOpen(false)
      toast.success("Plano excluído com sucesso")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function navigateMonth(delta: number) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 1) {
      newMonth = 12
      newYear--
    } else if (newMonth > 12) {
      newMonth = 1
      newYear++
    }
    router.push(`/planejamento/${newYear}/${newMonth}`)
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const periodCount = plan?.cutDays.length ?? 2

  // Dados por período
  const periodData = Array.from({ length: periodCount }, (_, i) => {
    const p = i + 1
    return {
      period: p,
      label: plan ? getPeriodLabel(plan.cutDays, p, daysInMonth) : `Período ${p}`,
      expenses: plan?.expenses.filter((e) => e.period === p) ?? [],
      incomes: plan?.incomes.filter((inc) => inc.period === p) ?? [],
    }
  })

  // Saldos em cadeia
  const summaries = periodData.reduce<ReturnType<typeof calcPeriodSummary>[]>(
    (acc, pd, i) => {
      const entryBalance = i === 0
        ? (plan?.initialBalance ?? 0)
        : acc[i - 1].balance
      acc.push(calcPeriodSummary(entryBalance, pd.expenses, pd.incomes))
      return acc
    },
    []
  )

  // Grid cols dinâmico — max 3 colunas, wrap automático para 4+ períodos
  const gridStyle = { gridTemplateColumns: `repeat(${Math.min(periodCount, 3)}, minmax(0, 1fr))` }

  return (
    <>
      <PageHeader
        title={`${getMonthName(month)} ${year}`}
        description="Planejamento financeiro mensal"
        action={
          <div className="flex items-center gap-2">
            {plan && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDeleteOpen(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : !plan ? (
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold mb-2">
            Plano não encontrado
          </h2>
          <p className="text-muted-foreground mb-6">
            Gere o plano para {getMonthName(month)} de {year} automaticamente
            a partir das despesas recorrentes e receitas cadastradas.
          </p>
          <Button
            size="lg"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            <Wand2 className="mr-2 h-5 w-5" />
            {generateMutation.isPending ? "Gerando..." : "Gerar Mês"}
          </Button>
        </div>
      ) : (
        <>
          {/* Desktop: N columns side by side */}
          <div className="hidden lg:grid gap-6" style={gridStyle}>
            {periodData.map((pd, i) => (
              <div key={pd.period} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{pd.label}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddExpensePeriod(pd.period)
                      setAddExpenseOpen(true)
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Despesa
                  </Button>
                </div>
                <PeriodPanel
                  planId={plan.id}
                  expenses={pd.expenses}
                  period={pd.period}
                  year={year}
                  month={month}
                />
                <IncomeSection
                  planId={plan.id}
                  incomes={pd.incomes}
                  period={pd.period}
                  year={year}
                  month={month}
                  onAddIncome={() => {
                    setAddIncomePeriod(pd.period)
                    setAddIncomeOpen(true)
                  }}
                />
                <PeriodSummary
                  label={`Período ${pd.period}`}
                  summary={summaries[i]}
                  showEntryBalance
                  isFinal={i === periodCount - 1}
                />
              </div>
            ))}
          </div>

          {/* Mobile: Tabs */}
          <div className="lg:hidden">
            <Tabs defaultValue="p1">
              <TabsList className="w-full">
                {periodData.map((pd) => (
                  <TabsTrigger key={pd.period} value={`p${pd.period}`} className="flex-1">
                    P{pd.period}
                  </TabsTrigger>
                ))}
              </TabsList>

              {periodData.map((pd, i) => (
                <TabsContent key={pd.period} value={`p${pd.period}`} className="space-y-4 mt-4">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAddExpensePeriod(pd.period)
                        setAddExpenseOpen(true)
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Despesa
                    </Button>
                  </div>
                  <PeriodPanel
                    planId={plan.id}
                    expenses={pd.expenses}
                    period={pd.period}
                    year={year}
                    month={month}
                  />
                  <IncomeSection
                    planId={plan.id}
                    incomes={pd.incomes}
                    period={pd.period}
                    year={year}
                    month={month}
                    onAddIncome={() => {
                      setAddIncomePeriod(pd.period)
                      setAddIncomeOpen(true)
                    }}
                  />
                  <PeriodSummary
                    label={`Período ${pd.period}`}
                    summary={summaries[i]}
                    showEntryBalance
                    isFinal={i === periodCount - 1}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Dialogs */}
          <AddExpenseDialog
            open={addExpenseOpen}
            onOpenChange={setAddExpenseOpen}
            planId={plan.id}
            period={addExpensePeriod}
            year={year}
            month={month}
          />
          <AddIncomeDialog
            open={addIncomeOpen}
            onOpenChange={setAddIncomeOpen}
            planId={plan.id}
            period={addIncomePeriod}
            year={year}
            month={month}
          />

          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Excluir Plano Mensal"
            description={`Tem certeza que deseja excluir o plano de ${getMonthName(month)} ${year}? Todas as despesas e receitas deste mês serão removidas permanentemente.`}
            onConfirm={() => deleteMutation.mutate()}
            loading={deleteMutation.isPending}
          />
        </>
      )}
    </>
  )
}
