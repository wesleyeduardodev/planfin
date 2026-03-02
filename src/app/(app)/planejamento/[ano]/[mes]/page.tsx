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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { PeriodPanel } from "@/components/plan/period-panel"
import { IncomeSection } from "@/components/plan/income-section"
import { PeriodSummary } from "@/components/plan/period-summary"
import { AddExpenseDialog } from "@/components/plan/add-expense-dialog"
import { AddIncomeDialog } from "@/components/plan/add-income-dialog"
import { getMonthName } from "@/lib/format"
import { calcPeriodSummary } from "@/lib/calculations"

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
  cutDay1: number
  cutDay2: number
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

  const p1Expenses = plan?.expenses.filter((e) => e.period === 1) || []
  const p2Expenses = plan?.expenses.filter((e) => e.period === 2) || []
  const p1Incomes = plan?.incomes.filter((i) => i.period === 1) || []
  const p2Incomes = plan?.incomes.filter((i) => i.period === 2) || []

  const summaryP1 = calcPeriodSummary(plan?.initialBalance ?? 0, p1Expenses, p1Incomes)
  const summaryP2 = calcPeriodSummary(summaryP1.balance, p2Expenses, p2Incomes)

  const daysInMonth = new Date(year, month, 0).getDate()

  return (
    <>
      <PageHeader
        title={`${getMonthName(month)} ${year}`}
        description="Planejamento financeiro mensal"
        action={
          <div className="flex items-center gap-2">
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
          {/* Desktop: 2 columns side by side. Mobile: tabs */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-6">
            {/* Period 1 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Período 1 (01 a {plan.cutDay2})
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddExpensePeriod(1)
                    setAddExpenseOpen(true)
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" /> Despesa
                </Button>
              </div>
              <PeriodPanel
                planId={plan.id}
                expenses={p1Expenses}
                period={1}
                year={year}
                month={month}
              />
              <IncomeSection
                planId={plan.id}
                incomes={p1Incomes}
                period={1}
                year={year}
                month={month}
                onAddIncome={() => {
                  setAddIncomePeriod(1)
                  setAddIncomeOpen(true)
                }}
              />
              <PeriodSummary
                label="Período 1"
                summary={summaryP1}
                showEntryBalance
              />
            </div>

            {/* Period 2 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Período 2 ({plan.cutDay2 + 1} a {daysInMonth})
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddExpensePeriod(2)
                    setAddExpenseOpen(true)
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" /> Despesa
                </Button>
              </div>
              <PeriodPanel
                planId={plan.id}
                expenses={p2Expenses}
                period={2}
                year={year}
                month={month}
              />
              <IncomeSection
                planId={plan.id}
                incomes={p2Incomes}
                period={2}
                year={year}
                month={month}
                onAddIncome={() => {
                  setAddIncomePeriod(2)
                  setAddIncomeOpen(true)
                }}
              />
              <PeriodSummary
                label="Período 2"
                summary={summaryP2}
                showEntryBalance
                isFinal
              />
            </div>
          </div>

          {/* Mobile: Tabs */}
          <div className="lg:hidden">
            <Tabs defaultValue="p1">
              <TabsList className="w-full">
                <TabsTrigger value="p1" className="flex-1">
                  Período 1
                </TabsTrigger>
                <TabsTrigger value="p2" className="flex-1">
                  Período 2
                </TabsTrigger>
              </TabsList>

              <TabsContent value="p1" className="space-y-4 mt-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddExpensePeriod(1)
                      setAddExpenseOpen(true)
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Despesa
                  </Button>
                </div>
                <PeriodPanel
                  planId={plan.id}
                  expenses={p1Expenses}
                  period={1}
                  year={year}
                  month={month}
                />
                <IncomeSection
                  planId={plan.id}
                  incomes={p1Incomes}
                  period={1}
                  year={year}
                  month={month}
                  onAddIncome={() => {
                    setAddIncomePeriod(1)
                    setAddIncomeOpen(true)
                  }}
                />
                <PeriodSummary
                  label="Período 1"
                  summary={summaryP1}
                  showEntryBalance
                />
              </TabsContent>

              <TabsContent value="p2" className="space-y-4 mt-4">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddExpensePeriod(2)
                      setAddExpenseOpen(true)
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Despesa
                  </Button>
                </div>
                <PeriodPanel
                  planId={plan.id}
                  expenses={p2Expenses}
                  period={2}
                  year={year}
                  month={month}
                />
                <IncomeSection
                  planId={plan.id}
                  incomes={p2Incomes}
                  period={2}
                  year={year}
                  month={month}
                  onAddIncome={() => {
                    setAddIncomePeriod(2)
                    setAddIncomeOpen(true)
                  }}
                />
                <PeriodSummary
                  label="Período 2"
                  summary={summaryP2}
                  showEntryBalance
                  isFinal
                />
              </TabsContent>
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
        </>
      )}
    </>
  )
}
