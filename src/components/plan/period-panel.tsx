"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { SwipeCard } from "@/components/shared/swipe-card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { PlanFilters, type PlanFilterValue, EMPTY_PLAN_FILTER, countActiveFilters, expenseMatchesFilter } from "@/components/shared/plan-filters"
import { matchesRange } from "@/lib/date-filter"

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
  return dir === "asc"
    ? <ArrowUp className="h-3 w-3 text-foreground" />
    : <ArrowDown className="h-3 w-3 text-foreground" />
}

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

interface PeriodPanelProps {
  planId: string
  expenses: PlanExpense[]
  period: number
  periodCount: number
  year: number
  month: number
  onAddExpense: () => void
}

interface Category {
  id: string
  name: string
  color: string
}

export function PeriodPanel({ planId, expenses: allExpenses, period, periodCount, year, month, onAddExpense }: PeriodPanelProps) {
  const queryClient = useQueryClient()
  const [localFilter, setLocalFilter] = useState<PlanFilterValue>(EMPTY_PLAN_FILTER)
  const filterActive = countActiveFilters(localFilter) > 0
  const expenses = useMemo(
    () => (filterActive ? allExpenses.filter((e) => expenseMatchesFilter(e, localFilter, matchesRange)) : allExpenses),
    [allExpenses, localFilter, filterActive]
  )
  const hiddenNoDate = filterActive && (localFilter.range.from || localFilter.range.to) ? allExpenses.filter((e) => !e.dueDate).length : 0
  const monthMin = `${year}-${String(month).padStart(2, "0")}-01`
  const monthMax = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editField, setEditField] = useState<"planned" | "paid" | "average" | "date" | "description">("planned")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [expandedPaid, setExpandedPaid] = useState<Set<string>>(new Set())
  // Sheet de categoria só existe no mobile; no desktop o overlay dele bloqueava a tela
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  const [toggleFixedTarget, setToggleFixedTarget] = useState<PlanExpense | null>(null)
  const [copyAveragesOpen, setCopyAveragesOpen] = useState(false)
  const [movePeriodTarget, setMovePeriodTarget] = useState<{ expense: PlanExpense; direction: -1 | 1 } | null>(null)
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null)
  const categoryRef = useRef<HTMLDivElement>(null)

  type SortKey = "description" | "category" | "type" | "payment" | "date" | "planned" | "average" | "paid" | "remaining"
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

  const sortedExpenses = useMemo(() => {
    if (!sortKey) return expenses
    return [...expenses].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "description":
          cmp = a.description.localeCompare(b.description, "pt-BR")
          break
        case "category":
          cmp = (a.category?.name ?? "\uffff").localeCompare(b.category?.name ?? "\uffff", "pt-BR")
          break
        case "type":
          cmp = (a.isFixed ? 0 : 1) - (b.isFixed ? 0 : 1)
          break
        case "payment":
          cmp = (a.paymentMethod === "CASH" ? 0 : 1) - (b.paymentMethod === "CASH" ? 0 : 1)
          break
        case "date":
          cmp = (a.dueDate ?? "").localeCompare(b.dueDate ?? "")
          break
        case "planned":
          cmp = a.plannedAmount - b.plannedAmount
          break
        case "average":
          cmp = (a.averageAmount ?? 0) - (b.averageAmount ?? 0)
          break
        case "paid":
          cmp = a.paidAmount - b.paidAmount
          break
        case "remaining":
          cmp = (a.plannedAmount - a.paidAmount) - (b.plannedAmount - b.paidAmount)
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [expenses, sortKey, sortDir])

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories")
      if (!res.ok) return []
      return res.json()
    },
  })

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryEditId(null)
      }
    }
    if (categoryEditId) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [categoryEditId])

  function confirmToggleFixed() {
    if (!toggleFixedTarget) return
    updateMutation.mutate({
      id: toggleFixedTarget.id,
      data: { isFixed: !toggleFixedTarget.isFixed },
    })
    setToggleFixedTarget(null)
  }

  function togglePaymentMethod(exp: PlanExpense) {
    updateMutation.mutate({
      id: exp.id,
      data: { paymentMethod: exp.paymentMethod === "CARD" ? "CASH" : "CARD" },
    })
  }

  function renderPaymentBadge(exp: PlanExpense) {
    const isCard = exp.paymentMethod === "CARD"
    return (
      <Badge
        variant="outline"
        title="Clique para alternar Dinheiro/Cartão"
        className={cn(
          "text-[10px] font-semibold shrink-0 cursor-pointer",
          isCard
            ? "text-violet-600 border-violet-300 bg-violet-50 dark:text-violet-400 dark:border-violet-800 dark:bg-violet-950/50"
            : "text-emerald-600 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50"
        )}
        onClick={() => togglePaymentMethod(exp)}
      >
        {isCard ? "Cartão" : "Dinheiro"}
      </Badge>
    )
  }

  function confirmMovePeriod() {
    if (!movePeriodTarget) return
    const { expense, direction } = movePeriodTarget
    const newPeriod = expense.period + direction
    if (newPeriod < 1 || newPeriod > periodCount) return
    updateMutation.mutate({
      id: expense.id,
      data: { period: newPeriod },
    })
    setMovePeriodTarget(null)
  }

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<PlanExpense>
    }) => {
      const res = await fetch(`/api/plans/expenses/${id}`, {
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
        body: JSON.stringify({ period, target: "expenses" }),
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
      const res = await fetch(`/api/plans/expenses/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      setDeleteId(null)
      toast.success("Despesa removida")
    },
    onError: () => toast.error("Erro ao remover"),
  })

  function startEdit(expense: PlanExpense, field: "planned" | "paid" | "average" | "date" | "description") {
    setEditingId(expense.id)
    setEditField(field)
    if (field === "description") {
      setEditValue(expense.description)
    } else if (field === "date") {
      if (expense.dueDate) {
        const d = new Date(expense.dueDate)
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
        expense.averageAmount != null
          ? expense.averageAmount.toFixed(2).replace(".", ",")
          : ""
      )
    } else {
      setEditValue(
        field === "planned"
          ? expense.plannedAmount.toFixed(2).replace(".", ",")
          : expense.paidAmount.toFixed(2).replace(".", ",")
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
        updateMutation.mutate({ id, data: { dueDate: null } as unknown as Partial<PlanExpense> })
        return
      }
      updateMutation.mutate({ id, data: { dueDate: `${editValue}T12:00:00Z` } as unknown as Partial<PlanExpense> })
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
      editField === "planned"
        ? { plannedAmount: parsed }
        : editField === "average"
          ? { averageAmount: parsed }
          : { paidAmount: parsed }
    updateMutation.mutate({ id, data })
  }

  function payFull(expense: PlanExpense) {
    updateMutation.mutate({
      id: expense.id,
      data: { paidAmount: expense.plannedAmount },
    })
  }

  function unpay(expense: PlanExpense) {
    updateMutation.mutate({
      id: expense.id,
      data: { paidAmount: 0 },
    })
  }

  const totalPlanned = expenses.reduce((s, e) => s + e.plannedAmount, 0)
  const totalPaid = expenses.reduce((s, e) => s + e.paidAmount, 0)
  const totalRemaining = totalPlanned - totalPaid
  const totalFixed = expenses.reduce((s, e) => s + (e.isFixed ? e.plannedAmount : 0), 0)
  const totalVariable = totalPlanned - totalFixed
  const totalAverage = expenses.reduce((s, e) => s + (e.averageAmount ?? 0), 0)
  const totalCard = expenses.reduce((s, e) => s + (e.paymentMethod === "CARD" ? e.plannedAmount : 0), 0)
  const totalCash = totalPlanned - totalCard

  const paymentBreakdown = (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold">
      <span className="text-emerald-600 dark:text-emerald-400">
        Dinheiro: <span className="font-mono">{formatCurrency(totalCash)}</span>
      </span>
      <span className="text-muted-foreground font-normal">|</span>
      <span className="text-violet-600 dark:text-violet-400">
        Cartão: <span className="font-mono">{formatCurrency(totalCard)}</span>
      </span>
    </span>
  )

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
      <span className="font-mono">{formatCurrency(totalPlanned)}</span>
    </span>
  )

  // Category selection list (shared between dropdown and sheet)
  function renderCategoryList(exp: PlanExpense) {
    return categories.map((cat) => (
      <button
        key={cat.id}
        className={cn(
          "flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-accent text-left rounded-md",
          exp.categoryId === cat.id && "bg-accent"
        )}
        onClick={() => {
          updateMutation.mutate({
            id: exp.id,
            data: { categoryId: cat.id },
          })
          setCategoryEditId(null)
        }}
      >
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: cat.color }}
        />
        {cat.name}
      </button>
    ))
  }

  // Desktop: dropdown popup
  // variant "card": instância do card mobile (abre o Sheet); "table": célula da tabela desktop (Popover próprio, não-controlado)
  function renderCategoryChip(exp: PlanExpense, variant: "table" | "card" = "table") {
    const cat = exp.category
    const chip = (withOnClick: boolean) => (
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border pl-1.5 pr-2 py-0.5 text-[11px] font-medium cursor-pointer hover:ring-2 hover:ring-ring/40 transition-shadow min-w-0",
          variant === "card" && "max-w-[130px]",
          !cat && "text-muted-foreground border-dashed"
        )}
        style={cat ? { borderColor: cat.color, color: cat.color, backgroundColor: `${cat.color}14` } : undefined}
        onClick={withOnClick ? () => setCategoryEditId(categoryEditId === exp.id ? null : exp.id) : undefined}
        aria-label="Mudar categoria"
        title={cat?.name ?? "Definir categoria"}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#d1d5db" }} />
        <span className="truncate">{cat?.name ?? "Sem categoria"}</span>
      </button>
    )
    if (variant === "card") return chip(true)
    if (isMobile) return chip(true)
    return (
      <Popover open={categoryEditId === exp.id} onOpenChange={(o) => setCategoryEditId(o ? exp.id : null)}>
        <PopoverTrigger asChild>{chip(false)}</PopoverTrigger>
        <PopoverContent align="start" className="w-[180px] p-1">
          {renderCategoryList(exp)}
        </PopoverContent>
      </Popover>
    )
  }

  // Shared: inline currency editor
  function renderCurrencyEditor(exp: PlanExpense, field: "planned" | "paid" | "average") {
    const value =
      field === "planned"
        ? exp.plannedAmount
        : field === "average"
          ? exp.averageAmount
          : exp.paidAmount
    const remaining = exp.plannedAmount - exp.paidAmount
    const isPaid = remaining <= 0

    if (editingId === exp.id && editField === field) {
      return (
        <input
          className="w-full text-right text-sm border rounded px-2 py-1 bg-background"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => commitEdit(exp.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit(exp.id)
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
              updateMutation.mutate({ id: exp.id, data: { averageAmount: exp.plannedAmount } })
            }
            title="Copiar Valor para Médio"
            aria-label="Copiar Valor para Médio"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
        <button
          className={cn(
            "font-mono text-sm hover:bg-muted px-1 rounded cursor-pointer",
            field === "paid" && isPaid && "text-emerald-600",
            field === "average" && "text-muted-foreground"
          )}
          onClick={() => startEdit(exp, field)}
        >
          {formatCurrency(value ?? 0)}
        </button>
      </span>
    )
  }

  // Shared: date editor
  function renderDateEditor(exp: PlanExpense) {
    if (editingId === exp.id && editField === "date") {
      return (
        <input
          type="date"
          className="w-36 text-sm border rounded px-1 py-1 bg-background"
          value={editValue}
          onChange={(e) => {
            setEditValue(e.target.value)
            if (e.target.value) {
              const isoDate = `${e.target.value}T12:00:00Z`
              updateMutation.mutate({ id: exp.id, data: { dueDate: isoDate } as unknown as Partial<PlanExpense> })
            }
          }}
          onBlur={() => commitEdit(exp.id)}
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
        onClick={() => startEdit(exp, "date")}
      >
        {exp.dueDate ? formatDate(exp.dueDate) : "-"}
      </button>
    )
  }

  const sortLabels: Record<SortKey, string> = {
    description: "Descrição",
    category: "Categoria",
    type: "Tipo",
    payment: "Pgto.",
    date: "Data",
    planned: "Valor",
    average: "Médio",
    paid: "Pago",
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
    <div className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-y-1.5 bg-red-50 dark:bg-red-950/30 rounded-t-lg">
      <h4 className="text-sm font-bold tracking-wide uppercase text-red-600 dark:text-red-400 flex items-center gap-2">
        Despesas
        {filterActive && (
          <span className="text-[10px] font-semibold normal-case tracking-normal rounded-full bg-background/80 border px-2 py-0.5 text-muted-foreground">
            filtrado · {expenses.length} de {allExpenses.length}
          </span>
        )}
      </h4>
      <div className="flex items-center gap-1">
        {allExpenses.length > 0 && (
          <PlanFilters value={localFilter} onChange={setLocalFilter} categories={categories} min={monthMin} max={monthMax} label="Filtros" size="xs" className="mr-1 max-w-[190px]" />
        )}
        {allExpenses.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-semibold text-muted-foreground"
            onClick={() => setCopyAveragesOpen(true)}
            title="Copiar Valor de todas as despesas deste período para o Médio"
          >
            <Copy className="mr-1 h-3 w-3" /> Médio
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs font-semibold"
          onClick={onAddExpense}
        >
          <Plus className="mr-1 h-3 w-3" /> Despesa
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* ========== MOBILE: Card list ========== */}
      <div className="sm:hidden rounded-lg border bg-card overflow-hidden">
        {headerBar}
        {expenses.length > 1 && sortBar}
        <div className="p-2 space-y-2">
        {expenses.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {filterActive && allExpenses.length > 0 ? "Nenhuma despesa neste intervalo" : "Nenhuma despesa"}
            {hiddenNoDate > 0 && <div className="text-xs mt-1">{hiddenNoDate} sem data oculta(s)</div>}
          </div>
        ) : (
          <>
            {sortedExpenses.map((exp) => {
              const remaining = exp.plannedAmount - exp.paidAmount
              const isPaid = remaining <= 0

              // Pago e recolhido: linha compacta, toque para expandir
              if (isPaid && !expandedPaid.has(exp.id)) {
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => setExpandedPaid((s) => new Set(s).add(exp.id))}
                    className="w-full flex items-center gap-2 rounded-md border border-emerald-200/70 bg-emerald-50/50 dark:bg-emerald-950/15 dark:border-emerald-900 px-3 py-2 text-left"
                  >
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="flex-1 min-w-0 truncate text-sm text-muted-foreground line-through">{exp.description}</span>
                    {exp.isAdjustment && <span className="text-[10px] text-muted-foreground shrink-0">Ajuste</span>}
                    <span className="font-mono text-sm text-emerald-700 dark:text-emerald-400 shrink-0">{formatCurrency(exp.paidAmount)}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                  </button>
                )
              }

              return (
                <SwipeCard
                  key={exp.id}
                  onSwipeRight={!isPaid ? () => payFull(exp) : undefined}
                  rightLabel="Pagar"
                  onSwipeLeft={() => setDeleteId(exp.id)}
                  leftLabel="Excluir"
                >
                <div
                  className={cn(
                    "rounded-lg border p-3 space-y-2.5 overflow-hidden",
                    isPaid
                      ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/15 dark:border-emerald-900"
                      : "border-l-3 border-l-red-400 border-red-200 bg-red-50/60 shadow-sm shadow-red-100 dark:bg-red-950/20 dark:border-red-800 dark:shadow-none"
                  )}
                >
                  {isPaid && (
                    <button
                      type="button"
                      className="w-full flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold -mb-1"
                      onClick={() => setExpandedPaid((s) => { const n = new Set(s); n.delete(exp.id); return n })}
                    >
                      <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Pago</span>
                      <span className="text-muted-foreground font-normal">Recolher</span>
                    </button>
                  )}
                  {/* Row 1: description */}
                  <div className="flex items-start gap-2 relative min-w-0">
                    {editingId === exp.id && editField === "description" ? (
                      <input
                        className="text-sm font-medium border rounded px-1 py-0.5 bg-background flex-1 min-w-0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(exp.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(exp.id)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        className={cn("text-sm font-medium text-left hover:bg-muted px-1 rounded cursor-pointer break-all", isPaid && "line-through text-muted-foreground")}
                        onClick={() => startEdit(exp, "description")}
                      >
                        {exp.description}
                      </button>
                    )}
                  </div>

                  {/* Row 2: badge + date + actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      {exp.isFixed ? (
                        <Badge variant="outline" className="text-[10px] font-semibold shrink-0 cursor-pointer text-indigo-600 border-indigo-300 bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/50" onClick={() => setToggleFixedTarget(exp)}>Fixo</Badge>
                      ) : (
                        <Badge className="text-[10px] font-semibold shrink-0 cursor-pointer bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800" onClick={() => setToggleFixedTarget(exp)}>Variável</Badge>
                      )}
                      {renderPaymentBadge(exp)}
                      {renderCategoryChip(exp, "card")}
                      {exp.isAdjustment && (
                        <Badge variant="outline" className="text-[10px] font-semibold shrink-0 text-slate-600 border-slate-300 bg-slate-100 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800" title="Lançamento criado pelo alinhamento de saldo">Ajuste</Badge>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {renderDateEditor(exp)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                      {periodCount > 1 && period > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMovePeriodTarget({ expense: exp, direction: -1 })} aria-label="Mover para período anterior">
                          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {periodCount > 1 && period < periodCount && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMovePeriodTarget({ expense: exp, direction: 1 })} aria-label="Mover para próximo período">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {!isPaid ? (
                        <Button size="sm" className="h-8 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => payFull(exp)} aria-label="Marcar como pago">
                          <Check className="h-3.5 w-3.5 mr-1" /> Pagar
                        </Button>
                      ) : (
                        <>
                          <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50">Pago</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => unpay(exp)} aria-label="Desmarcar pago">
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(exp.id)} aria-label="Remover despesa">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Row 3: values */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t text-[13px] [&_.font-mono]:text-[13px] [&_.font-mono]:px-0">
                    <div className="min-w-0">
                      <span className="text-muted-foreground text-xs block">Valor</span>
                      {renderCurrencyEditor(exp, "planned")}
                    </div>
                    <div className="min-w-0 text-right">
                      <span className="text-muted-foreground text-xs block">Médio</span>
                      {renderCurrencyEditor(exp, "average")}
                    </div>
                    <div className="min-w-0">
                      <span className="text-muted-foreground text-xs block">Pago</span>
                      {renderCurrencyEditor(exp, "paid")}
                    </div>
                    <div className="min-w-0 text-right">
                      <span className={cn("text-xs block", remaining > 0 ? "text-amber-600" : "text-emerald-600")}>Restante</span>
                      <span className={cn("font-mono text-sm", remaining > 0 ? "text-amber-600" : "text-emerald-600")}>
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>
                </div>
                </SwipeCard>
              )
            })}

            {/* Mobile totals */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono">{formatCurrency(totalPlanned)}</span>
                  {totalPaid > 0 && (
                    <span className="font-mono text-emerald-600">{formatCurrency(totalPaid)}</span>
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
              <div className="mt-2 pt-2 border-t space-y-1">
                {fixedVariableBreakdown}
                {paymentBreakdown}
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
              <TableHead className="w-32"><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("category")}>Categoria <SortIcon active={sortKey === "category"} dir={sortDir} /></button></TableHead>
              <TableHead className="w-20"><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("type")}>Tipo <SortIcon active={sortKey === "type"} dir={sortDir} /></button></TableHead>
              <TableHead className="w-24"><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("payment")}>Pgto. <SortIcon active={sortKey === "payment"} dir={sortDir} /></button></TableHead>
              <TableHead className="w-32"><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("date")}>Data <SortIcon active={sortKey === "date"} dir={sortDir} /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("planned")}>Valor <SortIcon active={sortKey === "planned"} dir={sortDir} /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("average")}>Médio <SortIcon active={sortKey === "average"} dir={sortDir} /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("paid")}>Pago <SortIcon active={sortKey === "paid"} dir={sortDir} /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("remaining")}>Restante <SortIcon active={sortKey === "remaining"} dir={sortDir} /></button></TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                  {filterActive && allExpenses.length > 0 ? "Nenhuma despesa neste intervalo" : "Nenhuma despesa"}
                  {hiddenNoDate > 0 && <div className="text-xs mt-1">{hiddenNoDate} sem data oculta(s)</div>}
                </TableCell>
              </TableRow>
            ) : (
              sortedExpenses.map((exp) => {
                const remaining = exp.plannedAmount - exp.paidAmount
                const isPaid = remaining <= 0

                return (
                  <TableRow
                    key={exp.id}
                    className={cn(
                      "group",
                      isPaid ? "bg-muted/30 opacity-50" : "bg-red-50/50 dark:bg-red-950/15"
                    )}
                  >
                    <TableCell className={cn(!isPaid && "border-l-3 border-l-red-400")}>
                      <div className="flex items-center gap-2 relative">
                        {editingId === exp.id && editField === "description" ? (
                          <input
                            className="text-sm border rounded px-1 py-0.5 bg-background flex-1 min-w-0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(exp.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit(exp.id)
                              if (e.key === "Escape") setEditingId(null)
                            }}
                            autoFocus
                          />
                        ) : (
                          <button
                            className={cn("text-sm text-left hover:bg-muted px-1 rounded cursor-pointer", isPaid && "line-through text-muted-foreground")}
                            onClick={() => startEdit(exp, "description")}
                          >
                            {exp.description}
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{renderCategoryChip(exp)}</TableCell>
                    <TableCell>
                      {exp.isFixed ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold cursor-pointer text-indigo-600 border-indigo-300 bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/50"
                          onClick={() => setToggleFixedTarget(exp)}
                        >
                          Fixo
                        </Badge>
                      ) : (
                        <Badge
                          className="text-[10px] font-semibold cursor-pointer bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
                          onClick={() => setToggleFixedTarget(exp)}
                        >
                          Variável
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell><div className="flex items-center gap-1">{renderPaymentBadge(exp)}{exp.isAdjustment && (  <Badge variant="outline" className="text-[10px] font-semibold shrink-0 text-slate-600 border-slate-300 bg-slate-100 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-800" title="Lançamento criado pelo alinhamento de saldo">Ajuste</Badge>)}</div></TableCell>
                    <TableCell>
                      {renderDateEditor(exp)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderCurrencyEditor(exp, "planned")}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderCurrencyEditor(exp, "average")}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderCurrencyEditor(exp, "paid")}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-mono text-sm",
                          remaining > 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                        )}
                      >
                        {formatCurrency(remaining)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        {periodCount > 1 && period > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMovePeriodTarget({ expense: exp, direction: -1 })} title="Mover para período anterior">
                            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        {periodCount > 1 && period < periodCount && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMovePeriodTarget({ expense: exp, direction: 1 })} title="Mover para próximo período">
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        {!isPaid && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => payFull(exp)}
                            title="Marcar como pago"
                          >
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        )}
                        {isPaid && (
                          <>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-emerald-600 border-emerald-200"
                            >
                              Pago
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => unpay(exp)}
                              title="Desmarcar pago"
                            >
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDeleteId(exp.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
            {/* Totals row */}
            {expenses.length > 0 && (
              <TableRow className="bg-red-50/80 dark:bg-red-950/20 font-bold border-t-2 border-red-200 dark:border-red-900">
                <TableCell colSpan={5}>
                  <div className="space-y-1">
                    {fixedVariableBreakdown}
                    {paymentBreakdown}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-base">
                  {formatCurrency(totalPlanned)}
                </TableCell>
                <TableCell className="text-right font-mono text-base text-muted-foreground">
                  {formatCurrency(totalAverage)}
                </TableCell>
                <TableCell className="text-right font-mono text-base">
                  {formatCurrency(totalPaid)}
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

      {/* Mobile: Sheet for category selection */}
      <Sheet open={!!categoryEditId && isMobile} onOpenChange={() => setCategoryEditId(null)}>
        <SheetContent side="bottom" className="sm:hidden">
          <SheetHeader>
            <SheetTitle>Selecionar Categoria</SheetTitle>
          </SheetHeader>
          <div className="py-2 space-y-1">
            {categoryEditId && renderCategoryList(
              expenses.find((e) => e.id === categoryEditId) ?? expenses[0]
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Remover Despesa"
        description="Remover esta despesa do plano?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={copyAveragesOpen}
        onOpenChange={setCopyAveragesOpen}
        title="Copiar para Médio"
        description={`Copiar o Valor de todas as despesas do Período ${period} para a coluna Médio? Valores médios já preenchidos serão sobrescritos.`}
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
        description={movePeriodTarget ? `Mover "${movePeriodTarget.expense.description}" para o período ${movePeriodTarget.expense.period + movePeriodTarget.direction}?` : ""}
        onConfirm={confirmMovePeriod}
        confirmLabel="Mover"
        loadingLabel="Movendo..."
        confirmVariant="default"
      />
    </>
  )
}
