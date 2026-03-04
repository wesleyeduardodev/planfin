"use client"

import { useState, useMemo } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Check, Trash2, Plus, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
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
import { SwipeableCard } from "@/components/shared/swipeable-card"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

interface PlanIncome {
  id: string
  period: number
  description: string
  expectedAmount: number
  receivedAmount: number
  dueDate: string | null
  isFixed: boolean
}

interface IncomeSectionProps {
  planId: string
  incomes: PlanIncome[]
  period: number
  periodCount: number
  year: number
  month: number
  onAddIncome: () => void
}

export function IncomeSection({
  incomes,
  period,
  periodCount,
  year,
  month,
  onAddIncome,
}: IncomeSectionProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editField, setEditField] = useState<"expected" | "received" | "description" | "date">("expected")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  type SortKey = "description" | "type" | "date" | "expected" | "received"
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
        case "received":
          cmp = a.receivedAmount - b.receivedAmount
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [incomes, sortKey, sortDir])

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-foreground" />
      : <ArrowDown className="h-3 w-3 text-foreground" />
  }

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

  function startEdit(income: PlanIncome, field: "expected" | "received" | "description" | "date") {
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
    const parsed = parseFloat(editValue.replace(/\./g, "").replace(",", "."))
    if (isNaN(parsed)) {
      setEditingId(null)
      return
    }
    const data =
      editField === "expected"
        ? { expectedAmount: parsed }
        : { receivedAmount: parsed }
    updateMutation.mutate({ id, data })
  }

  function toggleFixed(income: PlanIncome) {
    updateMutation.mutate({
      id: income.id,
      data: { isFixed: !income.isFixed },
    })
  }

  function movePeriod(income: PlanIncome, direction: -1 | 1) {
    const newPeriod = income.period + direction
    if (newPeriod < 1 || newPeriod > periodCount) return
    updateMutation.mutate({
      id: income.id,
      data: { period: newPeriod },
    })
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

  function renderCurrencyEditor(inc: PlanIncome, field: "expected" | "received") {
    const value = field === "expected" ? inc.expectedAmount : inc.receivedAmount
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
      <button
        className={cn(
          "font-mono text-sm hover:bg-muted px-1 rounded cursor-pointer",
          field === "received" && isReceived && "text-emerald-600"
        )}
        onClick={() => startEdit(inc, field)}
      >
        {formatCurrency(value)}
      </button>
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
    return inc.isFixed ? (
      <Badge
        variant="outline"
        className="text-[10px] font-semibold cursor-pointer text-indigo-600 border-indigo-300 bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/50"
        onClick={() => toggleFixed(inc)}
      >
        Fixo
      </Badge>
    ) : (
      <Badge
        className="text-[10px] font-semibold cursor-pointer bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800"
        onClick={() => toggleFixed(inc)}
      >
        Variável
      </Badge>
    )
  }

  const totalExpected = incomes.reduce((s, i) => s + i.expectedAmount, 0)
  const totalReceived = incomes.reduce((s, i) => s + i.receivedAmount, 0)

  const sortLabels: Record<SortKey, string> = {
    description: "Descrição",
    type: "Tipo",
    date: "Data",
    expected: "Esperado",
    received: "Recebido",
  }

  const sortBar = (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b overflow-x-auto">
      {(Object.keys(sortLabels) as SortKey[]).map((key) => (
        <button
          key={key}
          className={cn(
            "flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border whitespace-nowrap cursor-pointer",
            sortKey === key
              ? "bg-primary text-primary-foreground border-primary"
              : "text-muted-foreground hover:bg-muted border-transparent"
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
    <div className="px-4 py-2.5 border-b flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 rounded-t-lg">
      <h4 className="text-sm font-bold tracking-wide uppercase text-emerald-600 dark:text-emerald-400">
        Receitas
      </h4>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs font-semibold"
        onClick={onAddIncome}
      >
        <Plus className="mr-1 h-3 w-3" /> Entrada
      </Button>
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
              Nenhuma receita
            </div>
          ) : (
            <>
              {sortedIncomes.map((inc) => {
                const isReceived = inc.receivedAmount >= inc.expectedAmount

                return (
                  <SwipeableCard
                    key={inc.id}
                    onSwipeRight={() => receiveFull(inc)}
                    onSwipeLeft={() => setDeleteId(inc.id)}
                    rightLabel="Recebido"
                    leftLabel="Excluir"
                    disableRight={isReceived}
                  >
                  <div className={cn(
                    "rounded-lg border p-3 space-y-2.5 overflow-hidden",
                    isReceived
                      ? "opacity-60"
                      : "border-l-3 border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/10"
                  )}>
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {renderTypeBadge(inc)}
                        <span className="text-xs text-muted-foreground">
                          {inc.dueDate ? formatDate(inc.dueDate) : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {periodCount > 1 && period > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePeriod(inc, -1)} aria-label="Mover para período anterior">
                            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {periodCount > 1 && period < periodCount && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => movePeriod(inc, 1)} aria-label="Mover para próximo período">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {!isReceived ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => receiveFull(inc)} aria-label="Marcar como recebido">
                            <Check className="h-4 w-4 text-emerald-600" />
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
                    <div className="flex items-center justify-between gap-3 pt-1 border-t">
                      <div className="text-left">
                        <span className="text-muted-foreground text-xs block">Esperado</span>
                        {renderCurrencyEditor(inc, "expected")}
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground text-xs block">Recebido</span>
                        {renderCurrencyEditor(inc, "received")}
                      </div>
                    </div>
                  </div>
                  </SwipeableCard>
                )
              })}
              <div className="rounded-lg bg-emerald-50/30 dark:bg-emerald-950/10 p-3 flex items-center justify-between text-sm font-semibold">
                <span>Total</span>
                <div className="flex items-center gap-4">
                  <span className="font-mono">{formatCurrency(totalExpected)}</span>
                  {totalReceived > 0 && (
                    <span className="font-mono text-emerald-600">{formatCurrency(totalReceived)}</span>
                  )}
                </div>
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
              <TableHead><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("description")}>Descrição <SortIcon column="description" /></button></TableHead>
              <TableHead className="w-20"><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("type")}>Tipo <SortIcon column="type" /></button></TableHead>
              <TableHead className="w-32"><button className="flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => toggleSort("date")}>Data <SortIcon column="date" /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("expected")}>Esperado <SortIcon column="expected" /></button></TableHead>
              <TableHead className="text-right w-28"><button className="flex items-center gap-1 ml-auto hover:text-foreground cursor-pointer" onClick={() => toggleSort("received")}>Recebido <SortIcon column="received" /></button></TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground text-sm">
                  Nenhuma receita
                </TableCell>
              </TableRow>
            ) : (
              sortedIncomes.map((inc) => {
                const isReceived = inc.receivedAmount >= inc.expectedAmount

                return (
                  <TableRow key={inc.id} className={cn(
                    isReceived ? "opacity-60" : "bg-amber-50/30 dark:bg-amber-950/10"
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
                      {renderCurrencyEditor(inc, "received")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        {periodCount > 1 && period > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePeriod(inc, -1)} title="Mover para período anterior">
                            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        {periodCount > 1 && period < periodCount && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => movePeriod(inc, 1)} title="Mover para próximo período">
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
                <TableCell colSpan={3} className="text-base">Total</TableCell>
                <TableCell className="text-right font-mono text-base">
                  {formatCurrency(totalExpected)}
                </TableCell>
                <TableCell className="text-right font-mono text-base">
                  {formatCurrency(totalReceived)}
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
    </>
  )
}
