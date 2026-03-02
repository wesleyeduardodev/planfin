"use client"

import { useState, useRef, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Check, Trash2, CreditCard } from "lucide-react"
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

interface PeriodPanelProps {
  planId: string
  expenses: PlanExpense[]
  period: number
  year: number
  month: number
}

interface Category {
  id: string
  name: string
  color: string
}

export function PeriodPanel({ expenses, year, month }: PeriodPanelProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editField, setEditField] = useState<"planned" | "paid" | "date">("planned")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null)
  const categoryRef = useRef<HTMLDivElement>(null)

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

  function startEdit(expense: PlanExpense, field: "planned" | "paid" | "date") {
    setEditingId(expense.id)
    setEditField(field)
    if (field === "date") {
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
    } else {
      setEditValue(
        field === "planned"
          ? expense.plannedAmount.toFixed(2).replace(".", ",")
          : expense.paidAmount.toFixed(2).replace(".", ",")
      )
    }
  }

  function commitEdit(id: string) {
    if (editField === "date") {
      if (!editValue) {
        updateMutation.mutate({ id, data: { dueDate: null } as unknown as Partial<PlanExpense> })
        return
      }
      updateMutation.mutate({ id, data: { dueDate: `${editValue}T12:00:00Z` } as unknown as Partial<PlanExpense> })
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
        : { paidAmount: parsed }
    updateMutation.mutate({ id, data })
  }

  function payFull(expense: PlanExpense) {
    updateMutation.mutate({
      id: expense.id,
      data: { paidAmount: expense.plannedAmount },
    })
  }

  const totalPlanned = expenses.reduce((s, e) => s + e.plannedAmount, 0)
  const totalPaid = expenses.reduce((s, e) => s + e.paidAmount, 0)
  const totalRemaining = totalPlanned - totalPaid

  // Shared: category dropdown
  function renderCategoryDropdown(exp: PlanExpense) {
    return (
      <>
        <button
          className="w-3 h-3 rounded-full shrink-0 cursor-pointer ring-offset-background hover:ring-2 hover:ring-ring hover:ring-offset-1 transition-shadow"
          style={{ backgroundColor: exp.category?.color ?? "#d1d5db" }}
          onClick={() => setCategoryEditId(categoryEditId === exp.id ? null : exp.id)}
          title="Mudar categoria"
        />
        {categoryEditId === exp.id && (
          <div
            ref={categoryRef}
            className="absolute left-0 top-6 z-50 bg-popover border rounded-md shadow-md py-1 min-w-[160px]"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-accent text-left",
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
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </>
    )
  }

  // Shared: inline currency editor
  function renderCurrencyEditor(exp: PlanExpense, field: "planned" | "paid") {
    const value = field === "planned" ? exp.plannedAmount : exp.paidAmount
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
      <button
        className={cn(
          "font-mono text-sm hover:bg-muted px-1 rounded cursor-pointer",
          field === "paid" && isPaid && "text-emerald-600"
        )}
        onClick={() => startEdit(exp, field)}
      >
        {formatCurrency(value)}
      </button>
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

  return (
    <>
      {/* ========== MOBILE: Card list ========== */}
      <div className="sm:hidden space-y-2">
        {expenses.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
            Nenhuma despesa
          </div>
        ) : (
          <>
            {expenses.map((exp) => {
              const remaining = exp.plannedAmount - exp.paidAmount
              const isPaid = remaining <= 0
              const isVariable = !!exp.recurringExpenseId && exp.plannedAmount === 0

              return (
                <div
                  key={exp.id}
                  className={cn(
                    "rounded-lg border bg-card p-3 space-y-2",
                    isPaid && "opacity-60"
                  )}
                >
                  {/* Row 1: category dot + description + actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 relative min-w-0 flex-1">
                      {renderCategoryDropdown(exp)}
                      <span className={cn("text-sm font-medium truncate", isPaid && "line-through text-muted-foreground")}>
                        {exp.description}
                      </span>
                      {isVariable && (
                        <CreditCard className="h-3 w-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
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
                        <Badge
                          variant="outline"
                          className="text-[10px] text-emerald-600 border-emerald-200"
                        >
                          Pago
                        </Badge>
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
                  </div>

                  {/* Row 2: date + values */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="text-muted-foreground">
                      {renderDateEditor(exp)}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-muted-foreground text-[10px] block">Valor</span>
                        {renderCurrencyEditor(exp, "planned")}
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground text-[10px] block">Pago</span>
                        {renderCurrencyEditor(exp, "paid")}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: remaining (if not paid) */}
                  {!isPaid && (
                    <div className="flex justify-end">
                      <span className={cn(
                        "font-mono text-xs",
                        remaining > 0 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        Restante: {formatCurrency(remaining)}
                      </span>
                    </div>
                  )}
                </div>
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
            </div>
          </>
        )}
      </div>

      {/* ========== DESKTOP: Table ========== */}
      <div className="hidden sm:block rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-32">Data</TableHead>
              <TableHead className="text-right w-28">Valor</TableHead>
              <TableHead className="text-right w-28">Pago</TableHead>
              <TableHead className="text-right w-28">Restante</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Nenhuma despesa
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((exp) => {
                const remaining = exp.plannedAmount - exp.paidAmount
                const isPaid = remaining <= 0
                const isVariable = !!exp.recurringExpenseId && exp.plannedAmount === 0

                return (
                  <TableRow
                    key={exp.id}
                    className={cn(isPaid && "bg-muted/30")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2 relative">
                        {renderCategoryDropdown(exp)}
                        <span className={cn("text-sm", isPaid && "line-through text-muted-foreground")}>
                          {exp.description}
                        </span>
                        {isVariable && (
                          <CreditCard className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderDateEditor(exp)}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderCurrencyEditor(exp, "planned")}
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
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-600 border-emerald-200"
                          >
                            Pago
                          </Badge>
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
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>Total</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totalPlanned)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totalPaid)}
                </TableCell>
                <TableCell className="text-right font-mono">
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
        title="Remover Despesa"
        description="Remover esta despesa do plano?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
