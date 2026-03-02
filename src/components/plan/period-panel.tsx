"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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

export function PeriodPanel({ expenses, year, month }: PeriodPanelProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editField, setEditField] = useState<"planned" | "paid" | "date">("planned")
  const [deleteId, setDeleteId] = useState<string | null>(null)

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
        const dd = String(d.getDate()).padStart(2, "0")
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const yyyy = d.getFullYear()
        setEditValue(`${dd}/${mm}/${yyyy}`)
      } else {
        setEditValue("")
      }
    } else {
      setEditValue(
        field === "planned"
          ? expense.plannedAmount.toFixed(2).replace(".", ",")
          : expense.paidAmount.toFixed(2).replace(".", ",")
      )
    }
  }

  function handleDateInput(value: string) {
    // Auto-insert slashes: dd/mm/aaaa
    const digits = value.replace(/\D/g, "").slice(0, 8)
    let formatted = digits
    if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2)
    if (digits.length > 4) formatted = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4)
    setEditValue(formatted)
  }

  function commitEdit(id: string) {
    if (editField === "date") {
      if (!editValue) {
        updateMutation.mutate({ id, data: { dueDate: null } as unknown as Partial<PlanExpense> })
        return
      }
      const parts = editValue.split("/")
      if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
        const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`
        updateMutation.mutate({ id, data: { dueDate: isoDate } as unknown as Partial<PlanExpense> })
      } else {
        setEditingId(null)
      }
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

  return (
    <>
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-20 hidden sm:table-cell">Data</TableHead>
              <TableHead className="text-right w-28">Valor</TableHead>
              <TableHead className="text-right w-28">Pago</TableHead>
              <TableHead className="text-right w-28 hidden sm:table-cell">Restante</TableHead>
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
                      <div className="flex items-center gap-2">
                        {exp.category && (
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: exp.category.color }}
                          />
                        )}
                        <span className={cn("text-sm", isPaid && "line-through text-muted-foreground")}>
                          {exp.description}
                        </span>
                        {isVariable && (
                          <CreditCard className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {editingId === exp.id && editField === "date" ? (
                        <input
                          type="text"
                          placeholder="dd/mm/aaaa"
                          className="w-28 text-sm border rounded px-1 py-1 bg-background"
                          value={editValue}
                          onChange={(e) => handleDateInput(e.target.value)}
                          onBlur={() => commitEdit(exp.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(exp.id)
                            if (e.key === "Escape") setEditingId(null)
                          }}
                          autoFocus
                        />
                      ) : (
                        <button
                          className="hover:bg-muted px-1 rounded cursor-pointer"
                          onClick={() => startEdit(exp, "date")}
                        >
                          {exp.dueDate ? formatDate(exp.dueDate) : "-"}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === exp.id && editField === "planned" ? (
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
                      ) : (
                        <button
                          className="font-mono text-sm hover:bg-muted px-1 rounded cursor-pointer"
                          onClick={() => startEdit(exp, "planned")}
                        >
                          {formatCurrency(exp.plannedAmount)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === exp.id && editField === "paid" ? (
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
                      ) : (
                        <button
                          className={cn(
                            "font-mono text-sm hover:bg-muted px-1 rounded cursor-pointer",
                            isPaid && "text-emerald-600"
                          )}
                          onClick={() => startEdit(exp, "paid")}
                        >
                          {formatCurrency(exp.paidAmount)}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">
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
                <TableCell colSpan={2} className="hidden sm:table-cell">
                  Total
                </TableCell>
                <TableCell className="sm:hidden">Total</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totalPlanned)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(totalPaid)}
                </TableCell>
                <TableCell className="text-right font-mono hidden sm:table-cell">
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
