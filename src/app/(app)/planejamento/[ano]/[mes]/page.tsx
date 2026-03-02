"use client"

import { use, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  Wand2,
  Copy,
  Plus,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/page-header"
import { PeriodPanel } from "@/components/plan/period-panel"
import { IncomeSection } from "@/components/plan/income-section"
import { PeriodSummary } from "@/components/plan/period-summary"
import { AddExpenseDialog } from "@/components/plan/add-expense-dialog"
import { AddIncomeDialog } from "@/components/plan/add-income-dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { getMonthName, formatCurrency } from "@/lib/format"
import { calcPeriodSummary } from "@/lib/calculations"
import { getPeriodLabel } from "@/lib/periods"
import { cn } from "@/lib/utils"

interface PlanExpense {
  id: string
  period: number
  description: string
  dueDate: string | null
  plannedAmount: number
  paidAmount: number
  isFixed: boolean
  categoryId: string | null
  category: { id: string; name: string; color: string } | null
}

interface PlanIncome {
  id: string
  period: number
  description: string
  expectedAmount: number
  receivedAmount: number
  dueDate: string | null
  isFixed: boolean
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
  const [deletePeriod, setDeletePeriod] = useState<number | null>(null)
  const [addPeriodOpen, setAddPeriodOpen] = useState(false)
  const [newPeriodDay, setNewPeriodDay] = useState(15)

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
    mutationFn: async (mode: "generate" | "copy-fixed" | "copy-all" = "generate") => {
      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, mode }),
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

  const deletePeriodMutation = useMutation({
    mutationFn: async (period: number) => {
      if (!plan) return
      const res = await fetch(`/api/plans/${plan.id}/periods/${period}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao excluir período")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      setDeletePeriod(null)
      toast.success("Período excluído. Itens movidos para o período anterior.")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const addPeriodMutation = useMutation({
    mutationFn: async (cutDay: number) => {
      if (!plan) return
      const res = await fetch(`/api/plans/${plan.id}/periods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cutDay }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao adicionar período")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      setAddPeriodOpen(false)
      toast.success("Período adicionado")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function openAddPeriod() {
    // Sugerir dia default: ponto médio do maior intervalo
    if (plan) {
      const days = [...plan.cutDays, daysInMonth + 1]
      let maxGap = 0
      let bestDay = 15
      for (let i = 0; i < days.length - 1; i++) {
        const gap = days[i + 1] - days[i]
        if (gap > maxGap) {
          maxGap = gap
          bestDay = days[i] + Math.floor(gap / 2)
        }
      }
      setNewPeriodDay(Math.min(bestDay, daysInMonth))
    }
    setAddPeriodOpen(true)
  }

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

  // Saldos em cadeia (projetado + real)
  const summaries = periodData.reduce<ReturnType<typeof calcPeriodSummary>[]>(
    (acc, pd, i) => {
      const entryBalance = i === 0
        ? (plan?.initialBalance ?? 0)
        : acc[i - 1].balance
      const realEntryBalance = i === 0
        ? (plan?.initialBalance ?? 0)
        : acc[i - 1].realBalance
      acc.push(calcPeriodSummary(entryBalance, pd.expenses, pd.incomes, realEntryBalance))
      return acc
    },
    []
  )

  return (
    <>
      <PageHeader
        title={`${getMonthName(month)} ${year}`}
        description="Planejamento financeiro mensal"
        action={
          <div className="flex items-center gap-2">
            {plan && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAddPeriod}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Período
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeleteOpen(true)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
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
        <div className="py-12 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold mb-2">
              Plano não encontrado
            </h2>
            <p className="text-muted-foreground">
              Crie o plano para {getMonthName(month)} de {year}:
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => generateMutation.mutate("generate")}
              disabled={generateMutation.isPending}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 hover:border-primary hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Wand2 className="h-8 w-8 text-primary" />
              <span className="font-semibold text-sm">Gerar do Zero</span>
              <span className="text-xs text-muted-foreground text-center">
                Cria plano vazio para preencher manualmente
              </span>
            </button>
            <button
              onClick={() => generateMutation.mutate("copy-fixed")}
              disabled={generateMutation.isPending}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 hover:border-primary hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Copy className="h-8 w-8 text-primary" />
              <span className="font-semibold text-sm">Copiar Fixos</span>
              <span className="text-xs text-muted-foreground text-center">
                Copia períodos, despesas e receitas fixas do mês anterior
              </span>
            </button>
            <button
              onClick={() => generateMutation.mutate("copy-all")}
              disabled={generateMutation.isPending}
              className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 hover:border-primary hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Copy className="h-8 w-8 text-primary" />
              <span className="font-semibold text-sm">Copiar Tudo</span>
              <span className="text-xs text-muted-foreground text-center">
                Copia tudo do mês anterior
              </span>
            </button>
          </div>
          {generateMutation.isPending && (
            <p className="text-center text-muted-foreground mt-4 text-sm">Gerando plano...</p>
          )}
        </div>
      ) : (
        <>
          {/* Banner de saldo inicial */}
          {(() => {
            const prevMonth = month === 1 ? 12 : month - 1
            const prevYear = month === 1 ? year - 1 : year
            const bal = plan.initialBalance
            const isPositive = bal >= 0
            return (
              <div className={cn(
                "rounded-lg border px-4 py-3 flex items-center justify-between mb-6",
                isPositive
                  ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                  : "bg-red-50/80 border-red-200 dark:bg-red-950/20 dark:border-red-800"
              )}>
                <span className="text-sm text-muted-foreground">
                  Saldo de {getMonthName(prevMonth)} {prevYear}
                </span>
                <span className={cn(
                  "font-mono font-bold text-lg",
                  isPositive ? "text-emerald-600" : "text-red-500"
                )}>
                  {formatCurrency(bal)}
                </span>
              </div>
            )
          })()}

          {/* Desktop: empilhado vertical */}
          <div className="hidden lg:block space-y-8">
            {periodData.map((pd, i) => (
              <div key={pd.period} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{pd.label}</h2>
                  {pd.period > 1 && periodCount > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeletePeriod(pd.period)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
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
                <PeriodPanel
                  planId={plan.id}
                  expenses={pd.expenses}
                  period={pd.period}
                  year={year}
                  month={month}
                  onAddExpense={() => {
                    setAddExpensePeriod(pd.period)
                    setAddExpenseOpen(true)
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
                    Per. {pd.period}
                  </TabsTrigger>
                ))}
              </TabsList>

              {periodData.map((pd, i) => (
                <TabsContent key={pd.period} value={`p${pd.period}`} className="space-y-4 mt-4">
                  {pd.period > 1 && periodCount > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeletePeriod(pd.period)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
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
                  <PeriodPanel
                    planId={plan.id}
                    expenses={pd.expenses}
                    period={pd.period}
                    year={year}
                    month={month}
                    onAddExpense={() => {
                      setAddExpensePeriod(pd.period)
                      setAddExpenseOpen(true)
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

          <ConfirmDialog
            open={deletePeriod !== null}
            onOpenChange={() => setDeletePeriod(null)}
            title={`Excluir Período ${deletePeriod}`}
            description={`As despesas e receitas do Período ${deletePeriod} serão movidas para o Período ${(deletePeriod ?? 2) - 1}.`}
            onConfirm={() => deletePeriod && deletePeriodMutation.mutate(deletePeriod)}
            loading={deletePeriodMutation.isPending}
          />

          <Dialog open={addPeriodOpen} onOpenChange={setAddPeriodOpen}>
            <DialogContent className="max-w-xs">
              <DialogHeader>
                <DialogTitle>Adicionar Período</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  addPeriodMutation.mutate(newPeriodDay)
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Dia de início do novo período</Label>
                  <Input
                    type="number"
                    min={2}
                    max={daysInMonth}
                    value={newPeriodDay}
                    onChange={(e) => setNewPeriodDay(parseInt(e.target.value) || 2)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    O novo período será criado vazio. Mês tem {daysInMonth} dias.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddPeriodOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={addPeriodMutation.isPending}>
                    {addPeriodMutation.isPending ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  )
}
