"use client"

import { use, useState, useRef, useEffect } from "react"
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
  Pencil,
  FileText,
  FileSpreadsheet,
  Loader2,
  MoreHorizontal,
  Scale,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PeriodPanel } from "@/components/plan/period-panel"
import { IncomeSection } from "@/components/plan/income-section"
import { PeriodSummary } from "@/components/plan/period-summary"
import { MonthSummary } from "@/components/plan/month-summary"
import { AddExpenseDialog } from "@/components/plan/add-expense-dialog"
import { AlignBalanceDialog } from "@/components/plan/align-balance-dialog"
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
  averageAmount: number | null
  isFixed: boolean
  paymentMethod: "CASH" | "CARD"
  isAdjustment: boolean
  categoryId: string | null
  category: { id: string; name: string; color: string } | null
}

interface PlanIncome {
  id: string
  period: number
  description: string
  expectedAmount: number
  receivedAmount: number
  averageAmount: number | null
  dueDate: string | null
  isFixed: boolean
  isAdjustment: boolean
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
  const [copyAveragesOpen, setCopyAveragesOpen] = useState(false)
  const [deletePeriod, setDeletePeriod] = useState<number | null>(null)
  const [addPeriodOpen, setAddPeriodOpen] = useState(false)
  const [alignOpen, setAlignOpen] = useState(false)
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

  const copyAveragesMutation = useMutation({
    mutationFn: async () => {
      if (!plan) return
      const res = await fetch(`/api/plans/${plan.id}/copy-averages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      setCopyAveragesOpen(false)
      toast.success("Valores copiados para o Médio em todos os períodos")
    },
    onError: () => toast.error("Erro ao copiar valores"),
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

  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null)

  async function handleExport(format: "pdf" | "excel") {
    setExporting(format)
    try {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`
      const res = await fetch(`/api/export/${format}?months=${monthKey}`)
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Erro ao exportar")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
        || `planfin-${monthKey}.${format === "pdf" ? "pdf" : "xlsx"}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Erro ao exportar. Tente novamente.")
    } finally {
      setExporting(null)
    }
  }

  const [editingPeriod, setEditingPeriod] = useState<number | null>(null)
  const [editCutDay, setEditCutDay] = useState(1)
  const editInputRef = useRef<HTMLInputElement>(null)

  const editPeriodMutation = useMutation({
    mutationFn: async ({ period, newCutDay }: { period: number; newCutDay: number }) => {
      if (!plan) return
      const res = await fetch(`/api/plans/${plan.id}/periods`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, newCutDay, daysInMonth }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao editar período")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      setEditingPeriod(null)
      toast.success("Período atualizado")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function startEditPeriod(period: number) {
    if (!plan) return
    setEditCutDay(plan.cutDays[period - 1])
    setEditingPeriod(period)
  }

  function getEditMinMax(period: number): { min: number; max: number } {
    if (!plan) return { min: 1, max: daysInMonth }
    const cutDays = plan.cutDays
    const min = period === 1 ? 1 : cutDays[period - 2] + 1
    const max = period < cutDays.length ? cutDays[period] - 1 : daysInMonth
    return { min, max }
  }

  useEffect(() => {
    if (editingPeriod !== null) {
      editInputRef.current?.focus()
      editInputRef.current?.select()
    }
  }, [editingPeriod])

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

  // KPIs do mês
  const monthIncome = plan?.incomes.reduce((a, i) => a + i.expectedAmount, 0) ?? 0
  const monthExpenses = plan?.expenses.reduce((a, e) => a + e.plannedAmount, 0) ?? 0
  const monthCard = plan?.expenses.reduce((a, e) => a + (e.paymentMethod === "CARD" ? e.plannedAmount : 0), 0) ?? 0
  const monthPending = plan?.expenses.reduce((a, e) => a + Math.max(0, e.plannedAmount - e.paidAmount), 0) ?? 0
  const pendingCount = plan?.expenses.filter((e) => e.plannedAmount - e.paidAmount > 0).length ?? 0

  // Saldos em cadeia (projetado + real)
  const summaries = periodData.reduce<ReturnType<typeof calcPeriodSummary>[]>(
    (acc, pd, i) => {
      const entryBalance = i === 0 ? 0 : acc[i - 1].balance
      const realEntryBalance = i === 0 ? 0 : acc[i - 1].realBalance
      acc.push(calcPeriodSummary(entryBalance, pd.expenses, pd.incomes, realEntryBalance))
      return acc
    },
    []
  )
  const finalBalance = summaries.length ? summaries[summaries.length - 1].balance : 0
  const finalRealBalance = summaries.length ? summaries[summaries.length - 1].realBalance : 0

  return (
    <>
      {/* Header do mês */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigateMonth(-1)} aria-label="Mês anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="px-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold tracking-tight leading-tight">{getMonthName(month)} {year}</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              {plan
                ? `${periodCount} ${periodCount === 1 ? "período" : "períodos"} · ${plan.expenses.length} despesas · ${pendingCount} ${pendingCount === 1 ? "pendente" : "pendentes"}`
                : "Planejamento financeiro mensal"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigateMonth(1)} aria-label="Próximo mês">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {plan && (
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAlignOpen(true)}
              title="Informar o saldo real da conta e criar um lançamento de ajuste"
            >
              <Scale className="mr-1 h-3.5 w-3.5" /> Alinhar saldo
            </Button>
            <Button variant="outline" size="sm" onClick={openAddPeriod}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Período
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações" disabled={exporting !== null}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileText className="mr-2 h-4 w-4 text-red-500" /> Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" /> Exportar Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCopyAveragesOpen(true)}>
                  <Copy className="mr-2 h-4 w-4 text-muted-foreground" /> Copiar valores para Médio
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir plano do mês
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* KPIs do mês */}
      {plan && summaries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
          {[
            { label: "Receitas", value: monthIncome, cls: "text-emerald-600 dark:text-emerald-400" },
            { label: "Despesas", value: monthExpenses, cls: "text-red-500 dark:text-red-400" },
            { label: "Dinheiro", value: monthExpenses - monthCard, cls: "text-emerald-600 dark:text-emerald-400" },
            { label: "No cartão", value: monthCard, cls: "text-violet-600 dark:text-violet-400" },
            { label: "A pagar", value: monthPending, cls: monthPending > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground" },
            { label: "Saldo projetado", value: finalBalance, cls: finalBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400", sub: `Real: ${formatCurrency(finalRealBalance)}`, title: "Saldo ao final do mês considerando tudo que está planejado (pago ou não). O Real considera só o que já foi pago/recebido." },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border bg-card px-3 py-2.5" title={"title" in k ? k.title : undefined}>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{k.label}</div>
              <div className={cn("font-mono text-base sm:text-lg font-bold leading-tight mt-0.5", k.cls)}>{formatCurrency(k.value)}</div>
              {"sub" in k && k.sub && (
                <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{k.sub}</div>
              )}
            </div>
          ))}
        </div>
      )}

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
          {/* Desktop: empilhado vertical */}
          <div className="hidden lg:block space-y-8">
            {periodData.map((pd, i) => (
              <div key={pd.period} className="space-y-4">
                <div className="flex items-center gap-2">
                  {editingPeriod === pd.period ? (() => {
                    const { min, max } = getEditMinMax(pd.period)
                    return (
                      <form
                        className="flex items-center gap-2"
                        onSubmit={(e) => {
                          e.preventDefault()
                          editPeriodMutation.mutate({ period: pd.period, newCutDay: editCutDay })
                        }}
                      >
                        <span className="text-lg font-semibold">Período {pd.period} — dia</span>
                        <Input
                          ref={editInputRef}
                          type="number"
                          min={min}
                          max={max}
                          value={editCutDay}
                          onChange={(e) => setEditCutDay(parseInt(e.target.value) || min)}
                          className="w-16 h-8 text-center"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setEditingPeriod(null)
                          }}
                        />
                        <span className="text-xs text-muted-foreground">({min}–{max})</span>
                        <Button type="submit" size="sm" variant="outline" className="h-8" disabled={editPeriodMutation.isPending}>
                          OK
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditingPeriod(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    )
                  })() : (
                    <>
                      <h2 className="text-lg font-semibold">{pd.label}</h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => startEditPeriod(pd.period)}
                        title="Editar dia de início"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                  {editingPeriod !== pd.period && pd.period > 1 && periodCount > 1 && (
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
                  periodCount={periodCount}
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
                  periodCount={periodCount}
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
            <MonthSummary expenses={plan.expenses} incomes={plan.incomes} />
          </div>

          {/* Mobile: períodos em sequência */}
          <div className="lg:hidden">
            <div className="space-y-8">
              {periodData.map((pd, i) => (
                <div key={pd.period} className={cn("space-y-4", i > 0 && "pt-6 border-t-2 border-dashed")}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingPeriod === pd.period ? (() => {
                      const { min, max } = getEditMinMax(pd.period)
                      return (
                        <form
                          className="flex items-center gap-2"
                          onSubmit={(e) => {
                            e.preventDefault()
                            editPeriodMutation.mutate({ period: pd.period, newCutDay: editCutDay })
                          }}
                        >
                          <span className="text-sm font-semibold">Dia início:</span>
                          <Input
                            type="number"
                            min={min}
                            max={max}
                            value={editCutDay}
                            onChange={(e) => setEditCutDay(parseInt(e.target.value) || min)}
                            className="w-16 h-8 text-center"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingPeriod(null)
                            }}
                          />
                          <span className="text-xs text-muted-foreground">({min}–{max})</span>
                          <Button type="submit" size="sm" variant="outline" className="h-8" disabled={editPeriodMutation.isPending}>
                            OK
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditingPeriod(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      )
                    })() : (
                      <>
                        <span className="text-sm font-medium text-muted-foreground">{pd.label}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => startEditPeriod(pd.period)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
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
                      </>
                    )}
                  </div>
                  <IncomeSection
                    planId={plan.id}
                    incomes={pd.incomes}
                    period={pd.period}
                    periodCount={periodCount}
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
                    periodCount={periodCount}
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
            <div className="mt-8">
              <MonthSummary expenses={plan.expenses} incomes={plan.incomes} />
            </div>
          </div>

          {/* Dialogs */}
          <AlignBalanceDialog
            open={alignOpen}
            onOpenChange={setAlignOpen}
            planId={plan.id}
            year={year}
            month={month}
          />
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
            open={copyAveragesOpen}
            onOpenChange={setCopyAveragesOpen}
            title="Copiar para Médio — Mês Inteiro"
            description="Copiar o Valor/Esperado de todas as despesas e receitas de todos os períodos para a coluna Médio? Valores médios já preenchidos serão sobrescritos."
            onConfirm={() => copyAveragesMutation.mutate()}
            loading={copyAveragesMutation.isPending}
            confirmLabel="Copiar"
            loadingLabel="Copiando..."
            confirmVariant="default"
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
