"use client"

import { useState, useMemo } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Check, Trash2, Plus, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Copy, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { SwipeCard } from "@/components/shared/swipe-card"
import { DateRangeFilter } from "@/components/shared/date-range-filter"
import { type DateRange, EMPTY_RANGE, isRangeActive, matchesRange } from "@/lib/date-filter"

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 text-foreground" />
    : <ArrowDown className="h-3 w-3 text-foreground" />
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

interface IncomeSectionProps {
  planId: string
  incomes: PlanIncome[]
  period: number
  periodCount: number
  year: number
  month: number
  onAddIncome: () => void
  globalRange?: DateRange
}

export function IncomeSection({
  planId,
  incomes: allIncomes,
  period,
  periodCount,
  year,
  month,
  onAddIncome,
  globalRange,
}: IncomeSectionProps) {
  const queryClient = useQueryClient()
  const [localRange, setLocalRange] = useState<DateRange>(EMPTY_RANGE)
  const filterActive = isRangeActive(globalRange) || isRangeActive(localRange)
  const incomes = useMemo(
    () => (filterActive ? allIncomes.filter((i) => matchesRange(i.dueDate, [globalRange, localRange])) : allIncomes),
    [allIncomes, globalRange, localRange, filterActive]
  )
  const hiddenNoDate = filterActive ? allIncomes.filter((i) => !i.dueDate).length : 0
  const monthMin = `${year}-${String(month).padStart(2, "0")}-01`
  const monthMax = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editField, setEditField] = useState<"expected" | "received" | "average" | "description" | "date">("expected")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedReceived, setExpandedReceived] = useState<Set<string>>(new Set())
  const [toggleFixedTarget, setToggleFixedTarget] = useState<PlanIncome | null>(null)
  const [copyAveragesOpen, setCopyAveragesOpen] = useState(false)
  const [movePeriodTarget, setMovePeriodTarget] = useState<{ income: PlanIncome; direction: -1 | 1 } | null>(null)

  type SortKey = "description" | "type" | "date" | "expected" | "average" | "received" | "remaining"
  type SortDir = "asc" | "desc"
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sortedIncomes = useMemo(() => {
    if (!sortKey) return incomes
    return [...incomes].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "description":
          cmp = a.description.localeCompare(b.description, "pt-BR")
          break
        case "type":
          cmp = (a.isFixed ? 0 : 1) - (b.isFixed ? 0 : 1)
          break
        case "date":
          cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
          break
        case "expected":
          cmp = a.expectedAmount - b.expectedAmount
          break
        case "average":
          cmp = (a.averageAmount ?? 0) - (b.averageAmount ?? 0)
          break
        case "received":
          cmp = a.receivedAmount - b.receivedAmount
          break
        case "remaining":
          cmp = (a.expectedAmount - a.receivedAmount) - (b.expectedAmount - b.receivedAmount)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [incomes, sortKey, sortDir])

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: Record<string, any>
    }) => {
      const res = await fetch(`/api/plans/incomes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      setEditingId(null)
    },
    onError: () => toast.error("Erro ao atualizar"),
  })

  const copyAveragesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/plans/${planId}/copy-averages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, target: "incomes" }),
      })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      setCopyAveragesOpen(false)
      toast.success("Valores copiados para o Médio")
    },
    onError: () => toast.error("Erro ao copiar valores"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/plans/incomes/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      setDeleteId(null)
      toast.success("Receita removida")
    },
    onError: () => toast.error("Erro ao remover"),
  })

  function startEdit(income: PlanIncome, field: "expected" | "received" | "average" | "description" | "date") {
    setEditingId(income.id)
    setEditField(field)
    if (field === "description") {
      setEditValue(income.description)
    } else if (field === "date") {
      if (income.dueDate) {
        const d = new Date(income.dueDate)
        const yyyy = d.getUTCFullYear()
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
        const dd = String(d.getUTCDate()).padStart(2, "0")
        setEditValue(`${yyyy}-${mm}-${dd}`)
      } else {
        const mm = String(month).padStart(2, "0")
        setEditValue(`${year}-${mm}-01`)
      }
    } else if (field === "average") {
      setEditValue(
        income.averageAmount != null
          ? income.averageAmount.toFixed(2).replace(".", ",")
          : ""
      )
    } else {
      setEditValue(
        field === "expected"
          ? income.expectedAmount.toFixed(2).replace(".", ",")
          : income.receivedAmount.toFixed(2).replace(".", ",")
      )
    }
  }

  function commitEdit(id: string) {
    if (editField === "description") {
      const trimmed = editValue.trim()
      if (!trimmed) {
        setEditingId(null)
        return
      }
      updateMutation.mutate({ id, data: { description: trimmed } })
      return
    }
    if (editField === "date") {
      if (!editValue) {
        updateMutation.mutate({ id, data: { dueDate: null } })
        return
      }
      updateMutation.mutate({ id, data: { dueDate: `${editValue}T12:00:00Z` } })
      return
    }
    if (editField === "average" && !editValue.trim()) {
      updateMutation.mutate({ id, data: { averageAmount: null } })
      return
    }
    const parsed = parseFloat(editValue.replace(/\./g, "").replace(",", "."))
    if (isNaN(parsed)) {
      setEditingId(null)
      return
    }
    const data =
      editField === "expected"
        ? { expectedAmount: parsed }
        : editField === "average"
          ? { averageAmount: parsed }
          : { receivedAmount: parsed }
    updateMutation.mutate({ id, data })
  }

  function confirmToggleFixed() {
    if (!toggleFixedTarget) return
    updateMutation.mutate({
      id: toggleFixedTarget.id,
      data: { isFixed: !toggleFixedTarget.isFixed },
    })
    setToggleFixedTarget(null)
  }

  function confirmMovePeriod() {
    if (!movePeriodTarget) return
    const { income, direction } = movePeriodTarget
    const newPeriod = income.period + direction
    if (newPeriod < 1 || newPeriod > periodCount) return
    updateMutation.mutate({
      id: income.id,
      data: { period: newPeriod },
    })
    setMovePeriodTarget(null)
  }

  function receiveFull(income: PlanIncome) {
    updateMutation.mutate({
      id: income.id,
      data: { receivedAmount: income.expectedAmount },
    })
  }

  function unreceive(income: PlanIncome) {
    updateMutation.mutate({
      id: income.id,
      data: { receivedAmount: 0 },
    })
  }

  function renderCurrencyEditor(inc: PlanIncome, field: "expected" | "received" | "average") {
    const value =
      field === "expected"
        ? inc.expectedAmount
        : field === "average"
          ? inc.averageAmount
          : inc.receivedAmount
    const isReceived = inc.receivedAmount >= inc.expectedAmount

    if (editingId === inc.id && editField === field) {
      return (
        <input
          className="w-full text-right text-sm border rounded px-2 py-1 bg-background"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => commitEdit(inc.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit(inc.id)
            if (e.key === "Escape") setEditingId(null)
          }}
          autoFocus
        />
      )
    }
    return (
      <span className="inline-flex items-center gap-1">
        {field === "average" && (
          <button
            className={cn(
              "text-muted-foreground/60 hover:text-foreground cursor-pointer",
              value != null && "opacity-0 group-hover:opacity-100 max-sm:opacity-100"
            )}
            onClick={() =>
              updateMutation.mutate({ id: inc.id, data: { averageAmount: inc.expectedAmount } })
            }
            title="Copiar Esperado para Médio"
            aria-label="Copiar Esperado para Médio"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
        <button
          className={cn(
            "font-mono text-sm hover:bg-muted px-1 rounded cursor-pointer",
            field === "received" && isReceived && "text-emerald-600",
            field === "average" && "text-muted-foreground"
          )}
          onClick={() => startEdit(inc, field)}
        >
          {value != null ? formatCurrency(value) : "—"}
        </button>
      </span>
    )
  }

  function renderDateEditor(inc: PlanIncome) {
    if (editingId === inc.id && editField === "date") {
      return (
        <input
          type="date"
          className="w-36 text-sm border rounded px-1 py-1 bg-background"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value)
            if (e.target.value) {
              const isoDate = `${e.target.value}T12:00:00Z`
              updateMutation.mutate({ id: inc.id, data: { dueDate: isoDate } })
            }
          }}
          onBlur={() => commitEdit(inc.id)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditingId(null)
          }}
          autoFocus
        />
      )
    }
    return (
      <button
        className="hover:bg-muted px-1 rounded cursor-pointer text-sm text-muted-foreground"
        onClick={() => startEdit(inc, "date")}
      >
        {inc.dueDate ? formatDate(inc.dueDate) : "-"}
      </button>
    )
  }

  function renderTypeBadge(inc: PlanIncome) {
    const typeBadge = inc.isFixed ? (
      <Badge
        variant="outline"
        className="text-[10px] font-semibold cursor-pointer text-indigo-600 border-indigo-300 bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/50"
        onClick={() => setToggleFixedTarget(inc)}
      >
        Fixo
      </Badge>
    ) : (
      <Badge
        className="text-[10px] font-semibold cursor-pointer bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
        onClick={() => setToggleFixedTarget(inc)}
      >
        Variável
      </Badge>
    )
    if (!inc.isAdjustment) return typeBadge
    return (
      <span className="inline-flex items-center gap-1">
        {typeBadge}
        <Badge variant="outline" className="text-[10px] font-semibold shrink-0 text-slate-600 border-slate-300 bg-slate-100 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800" title="Lançamento criado pelo alinhamento de saldo">Ajuste</Badge>
      </span>
    )
  }

  const totalExpected = incomes.reduce((s, i) => s + i.expectedAmount, 0)
  const totalReceived = incomes.reduce((s, i) => s + i.receivedAmount, 0)
  const totalRemaining = totalExpected - totalReceived
  const totalFixed = incomes.reduce((s, i) => s + (i.isFixed ? i.expectedAmount : 0), 0)
  const totalVariable = totalExpected - totalFixed
  const totalAverage = incomes.reduce((s, i) => s + (i.averageAmount ?? 0), 0)

  const fixedVariableBreakdown = (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold">
      <span className="text-indigo-600 dark:text-indigo-400">
        Fixo: <span className="font-mono">{formatCurrency(totalFixed)}</span>
      </span>
      <span className="text-muted-foreground font-normal">+</span>
      <span className="text-amber-600 dark:text-amber-400">
        Variável: <span className="font-mono">{formatCurrency(totalVariable)}</span>
      </span>
      <span className="text-muted-foreground font-normal">=</span>
      <span className="font-mono">{formatCurrency(totalExpected)}</span>
    </span>
  )

  const sortLabels: Record<SortKey, string> = {
    description: "Descrição",
    type: "Tipo",
    date: "Data",
    expected: "Esperado",
    average: "Médio",
    received: "Recebido",
    remaining: "Restante",
  }

  const sortBar = (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b overflow-x-auto bg-muted/30">
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground mr-1 shrink-0">
        <ArrowUpDown className="h-3 w-3" /> Ordenar:
      </span>
      {(Object.keys(sortLabels) as SortKey[]).map((key) => (
        <button
          key={key}
          className={cn(
            "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap cursor-pointer",
            sortKey === key
              ? "bg-primary text-primary-foreground border-primary"
              : "text-muted-foreground bg-background hover:bg-muted border-border"
          )}
          onClick={() => toggleSort(key)}
        >
          {sortLabels[key]}
          {sortKey === key && (sortDir === "asc" ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />)}
        </button>
      ))}
    </div>
  )

  const headerBar = (
    <div className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-y-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-t-lg">
      <h4 className="text-sm font-bold tracking-wide uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
        Receitas
        {filterActive && (
          <span className="text-[10px] font-semibold normal-case tracking-normal rounded-full bg-background/80 border px-2 py-0.5 text-muted-foreground">
            filtrado · {incomes.length} de {allIncomes.length}
          </span>
        )}
      </h4>
      <div className="flex items-center gap-1">
        {allIncomes.length > 0 && (
          <DateRangeFilter value={localRange} onChange={setLocalRange} min={monthMin} max={monthMax} label="Data" size="xs" className="mr-1" />
        )}
        {allIncomes.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-semibold text-muted-foreground"
            onClick={() => setCopyAveragesOpen(true)}
            title="Copiar Esperado de todas as receitas deste período para o Médio"
          >
            <Copy className="mr-1 h-3 w-3" /> Médio
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs font-semibold"
          onClick={onAddIncome}
        >
          <Plus className="mr-1 h-3 w-3" /> Entrada
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* ========== MOBILE: Card list ========== */}
      <div className="sm:hidden rounded-lg border bg-card overflow-hidden">
        {headerBar}
        {incomes.length > 1 && sortBar}
        <div className="p-2 space-y-2">
          {incomes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {filterActive && allIncomes.length > 0 ? "Nenhuma receita neste intervalo" : "Nenhuma receita"}
              {hiddenNoDate > 0 && <div className="text-xs mt-1">{hiddenNoDate} sem data oculta(s)</div>}
            </div>
          ) : (
            <>
              {sortedIncomes.map((inc) => {
                const isReceived = inc.receivedAmount >= inc.expectedAmount
                const incRemaining = Math.max(0, inc.expectedAmount - inc.receivedAmount)

                if (isReceived && !expandedReceived.has(inc.id)) {
                  return (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => setExpandedReceived((s) => new Set(s).add(inc.id))}
                      className="w-full flex items-center gap-2 rounded-md border border-emerald-200/70 bg-emerald-50/50 dark:bg-emerald-950/15 dark:border-emerald-900 px-3 py-2 text-left"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-sm text-muted-foreground line-through">{inc.description}</span>
                      {inc.isAdjustment && <span className="text-[10px] text-muted-foreground shrink-0">Ajuste</span>}
                      <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400 shrink-0">{formatCurrency(inc.receivedAmount)}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                    </button>
                  )
                }

                return (
                  <SwipeCard
                    key={inc.id}
                    onSwipeRight={!isReceived ? () => receiveFull(inc) : undefined}
                    rightLabel="Receber"
                    onSwipeLeft={() => setDeleteId(inc.id)}
                    leftLabel="Excluir"
                  >
                  <div
                    className={cn(
                    "rounded-lg border p-3 space-y-2.5 overflow-hidden",
                    isReceived
                      ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/15 dark:border-emerald-900"
                      : "border-l-3 border-l-amber-400 border-amber-200 bg-amber-50/60 shadow-sm shadow-amber-100 dark:bg-amber-950/20 dark:border-amber-800 dark:shadow-none"
                  )}>
                    {isReceived && (
                      <button
                        type="button"
                        className="w-full flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold -mb-1"
                        onClick={() => setExpandedReceived((s) => { const n = new Set(s); n.delete(inc.id); return n })}
                      >
                        <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Recebido</span>
                        <span className="text-muted-foreground font-normal">Recolher</span>
                      </button>
                    )}
                    {/* Row 1: description */}
                    <div className="min-w-0">
                      {editingId === inc.id && editField === "description" ? (
                        <input
                          className="text-sm font-medium border rounded px-1 py-0.5 bg-background w-full min-w-0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(inc.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(inc.id)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          className="text-sm font-medium text-left hover:bg-muted px-1 rounded cursor-pointer break-all"
                          onClick={() => startEdit(inc, "description")}
                        >
                          {inc.description}
                        </button>
                      )}
                    </div>

                    {/* Row 2: badge + date + actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        {renderTypeBadge(inc)}
                        <div className="text-xs text-muted-foreground">
                          {renderDateEditor(inc)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        {periodCount > 1 && period > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMovePeriodTarget({ income: inc, direction: -1 })} aria-label="Mover para período anterior">
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {periodCount > 1 && period < periodCount && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMovePeriodTarget({ income: inc, direction: 1 })} aria-label="Mover para próximo período">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {!isReceived ? (
                          <Button size="sm" className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => receiveFull(inc)} aria-label="Marcar como recebido">
                            <Check className="h-3.5 w-3.5 mr-1" /> Receber
                          </Button>
                        ) : (
                          <>
                            <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50">OK</Badge>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => unreceive(inc)} aria-label="Desmarcar recebido">
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(inc.id)} aria-label="Remover receita">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Row 3: values */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t [&_.font-mono]:text-[13px] [&_.font-mono]:px-0">
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-xs block">Esperado</span>
                        {renderCurrencyEditor(inc, "expected")}
                      </div>
                      <div className="min-w-0 text-right">
                        <span className="text-muted-foreground text-xs block">Médio</span>
                        {renderCurrencyEditor(inc, "average")}
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-xs block">Recebido</span>
                        {renderCurrencyEditor(inc, "received")}
                      </div>
                      <div className="min-w-0 text-right">
                        <span className={cn("text-xs block", incRemaining > 0 ? "text-amber-600" : "text-emerald-600")}>Restante</span>
                        <span className={cn("font-mono text-sm", incRemaining > 0 ? "text-amber-600" : "text-emerald-600")}>
                          {formatCurrency(incRemaining)}
                        </span>
                      </div>
                    </div>
                  </div>
                  </SwipeCard>
                )
              })}
              <div className="rounded-lg bg-emerald-50/30 dark:bg-emerald-950/10 p-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <div className="flex items-center gap-4">
                    <span className="font-mono">{formatCurrency(totalExpected)}</span>
                    {totalReceived > 0 && (
                      <span className="font-mono text-emerald-600">{formatCurrency(totalReceived)}</span>
                    )}
                  </div>
                </div>
                {totalRemaining > 0 && (
                  <div className="flex justify-end mt-1">
                    <span className="font-mono text-xs text-amber-600">
                      Restante: {formatCurrency(totalRemaining)}
                    </span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t">
                  {fixedVariableBreakdown}
                </div>
                {totalAverage > 0 && (
                  <div className="flex justify-end mt-1">
                    <span className="font-mono text-xs text-muted-foreground">
                      Médio: {formatCurrency(totalAverage)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========== DESKTOP: Table ========== */}
      <div className="hidden sm:block rounded-lg border bg-card overflow-hidden">
        {headerBar}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("description")}>Descrição <SortIcon active={sortKey === "description"} dir={sortDir} /></button></TableHead>
              <TableHead className="w-20"><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("type")}>Tipo <SortIcon active={sortKey === "type"} dir={sortDir} /></button></TableHead>
              <TableHead className="w-32"><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("date")}>Data <SortIcon active={sortKey === "date"} dir={sortDir} /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("expected")}>Esperado <SortIcon active={sortKey === "expected"} dir={sortDir} /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("average")}>Médio <SortIcon active={sortKey === "average"} dir={sortDir} /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("received")}>Recebido <SortIcon active={sortKey === "received"} dir={sortDir} /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("remaining")}>Restante <SortIcon active={sortKey === "remaining"} dir={sortDir} /></button></TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-muted-foreground text-sm">
                  {filterActive && allIncomes.length > 0 ? "Nenhuma receita neste intervalo" : "Nenhuma receita"}
                  {hiddenNoDate > 0 && <div className="text-xs mt-1">{hiddenNoDate} sem data oculta(s)</div>}
                </TableCell>
              </TableRow>
            ) : (
              sortedIncomes.map((inc) => {
                const isReceived = inc.receivedAmount >= inc.expectedAmount
                const incRemaining = Math.max(0, inc.expectedAmount - inc.receivedAmount)

                return (
                  <TableRow key={inc.id} className={cn(
                    "group",
                    isReceived ? "opacity-50" : "bg-amber-50/50 dark:bg-amber-950/15"
                  )}>
                    <TableCell className={cn("text-sm", !isReceived && "border-l-3 border-l-amber-400")}>
                      {editingId === inc.id && editField === "description" ? (
                        <input
                          className="text-sm border rounded px-1 py-0.5 bg-background w-full min-w-0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(inc.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(inc.id)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          className="text-sm text-left hover:bg-muted px-1 rounded cursor-pointer"
                          onClick={() => startEdit(inc, "description")}
                        >
                          {inc.description}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {renderTypeBadge(inc)}
                    </TableCell>
                    <TableCell>
                      {renderDateEditor(inc)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderCurrencyEditor(inc, "expected")}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderCurrencyEditor(inc, "average")}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderCurrencyEditor(inc, "received")}
                    </TableCell>
                    <TableCell className={cn("text-right font-mono text-sm", incRemaining > 0 ? "text-amber-600" : "text-emerald-600")}>
                      {formatCurrency(incRemaining)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        {periodCount > 1 && period > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMovePeriodTarget({ income: inc, direction: -1 })} title="Mover para período anterior">
                            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        {periodCount > 1 && period < periodCount && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMovePeriodTarget({ income: inc, direction: 1 })} title="Mover para próximo período">
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        {!isReceived ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => receiveFull(inc)}
                            title="Marcar como recebido"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        ) : (
                          <>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50"
                            >
                              OK
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => unreceive(inc)}
                              title="Desmarcar recebido"
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteId(inc.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
            {incomes.length > 0 && (
              <TableRow className="bg-emerald-50/80 dark:bg-emerald-950/20 font-bold border-t-2 border-emerald-200 dark:border-emerald-900">
                <TableCell colSpan={3}>
                  {fixedVariableBreakdown}
                </TableCell>
                <TableCell className="text-right font-mono text-base">
                  {formatCurrency(totalExpected)}
                </TableCell>
                <TableCell className="text-right font-mono text-base text-muted-foreground">
                  {formatCurrency(totalAverage)}
                </TableCell>
                <TableCell className="text-right font-mono text-base">
                  {formatCurrency(totalReceived)}
                </TableCell>
                <TableCell className="text-right font-mono text-base">
                  {formatCurrency(totalRemaining)}
                </TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Remover Receita"
        description="Remover esta receita do plano?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={copyAveragesOpen}
        onOpenChange={setCopyAveragesOpen}
        title="Copiar para Médio"
        description={`Copiar o Esperado de todas as receitas do Período ${period} para a coluna Médio? Valores médios já preenchidos serão sobrescritos.`}
        onConfirm={() => copyAveragesMutation.mutate()}
        loading={copyAveragesMutation.isPending}
        confirmLabel="Copiar"
        loadingLabel="Copiando..."
        confirmVariant="default"
      />

      <ConfirmDialog
        open={!!toggleFixedTarget}
        onOpenChange={() => setToggleFixedTarget(null)}
        title="Alterar Tipo"
        description={toggleFixedTarget ? `Alterar "${toggleFixedTarget.description}" de ${toggleFixedTarget.isFixed ? "Fixo" : "Variável"} para ${toggleFixedTarget.isFixed ? "Variável" : "Fixo"}?` : ""}
        onConfirm={confirmToggleFixed}
        confirmLabel="Confirmar"
        loadingLabel="Alterando..."
        confirmVariant="default"
      />

      <ConfirmDialog
        open={!!movePeriodTarget}
        onOpenChange={() => setMovePeriodTarget(null)}
        title="Mover Período"
        description={movePeriodTarget ? `Mover "${movePeriodTarget.income.description}" para o período ${movePeriodTarget.income.period + movePeriodTarget.direction}?` : ""}
        onConfirm={confirmMovePeriod}
        confirmLabel="Mover"
        loadingLabel="Movendo..."
        confirmVariant="default"
      />
    </>
  )
}
