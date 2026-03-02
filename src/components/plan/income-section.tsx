"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Check, Trash2, Plus, X } from "lucide-react"
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
import { formatCurrency, formatShortDate } from "@/lib/format"
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
  year: number
  month: number
  onAddIncome: () => void
}

export function IncomeSection({
  incomes,
  year,
  month,
  onAddIncome,
}: IncomeSectionProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editField, setEditField] = useState<"expected" | "received" | "description">("expected")
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: { expectedAmount?: number; receivedAmount?: number; description?: string }
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

  function startEdit(income: PlanIncome, field: "expected" | "received" | "description") {
    setEditingId(income.id)
    setEditField(field)
    if (field === "description") {
      setEditValue(income.description)
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

  // Shared: inline currency editor
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

  const totalExpected = incomes.reduce((s, i) => s + i.expectedAmount, 0)
  const totalReceived = incomes.reduce((s, i) => s + i.receivedAmount, 0)

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
        <div className="p-2 space-y-2">
          {incomes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Nenhuma receita
            </div>
          ) : (
            <>
              {incomes.map((inc) => {
                const isReceived = inc.receivedAmount >= inc.expectedAmount

                return (
                  <div key={inc.id} className={cn("rounded-lg border p-3 space-y-2", isReceived && "opacity-60")}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {editingId === inc.id && editField === "description" ? (
                          <input
                            className="text-sm font-medium border rounded px-1 py-0.5 bg-background flex-1 min-w-0"
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
                            className="text-sm font-medium truncate text-left hover:bg-muted px-1 rounded cursor-pointer"
                            onClick={() => startEdit(inc, "description")}
                          >
                            {inc.description}
                          </button>
                        )}
                        {inc.isFixed ? (
                          <Badge variant="outline" className="text-[10px] font-semibold shrink-0 text-indigo-600 border-indigo-300 bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/50">Fixo</Badge>
                        ) : (
                          <Badge className="text-[10px] font-semibold shrink-0 bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">Variável</Badge>
                        )}
                        {inc.dueDate && (
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatShortDate(inc.dueDate)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!isReceived ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => receiveFull(inc)} title="Marcar como recebido">
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        ) : (
                          <>
                            <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:bg-emerald-950/50">OK</Badge>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => unreceive(inc)} title="Desmarcar recebido">
                              <X className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(inc.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 text-xs">
                      <div className="text-right">
                        <span className="text-muted-foreground text-[10px] block">Esperado</span>
                        {renderCurrencyEditor(inc, "expected")}
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground text-[10px] block">Recebido</span>
                        {renderCurrencyEditor(inc, "received")}
                      </div>
                    </div>
                  </div>
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
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right w-28">Esperado</TableHead>
              <TableHead className="text-right w-28">Recebido</TableHead>
              <TableHead className="w-20 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-sm">
                  Nenhuma receita
                </TableCell>
              </TableRow>
            ) : (
              incomes.map((inc) => {
                const isReceived = inc.receivedAmount >= inc.expectedAmount

                return (
                  <TableRow key={inc.id}>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5">
                        {editingId === inc.id && editField === "description" ? (
                          <input
                            className="text-sm border rounded px-1 py-0.5 bg-background flex-1 min-w-0"
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
                        {inc.isFixed ? (
                          <Badge variant="outline" className="text-[10px] font-semibold text-indigo-600 border-indigo-300 bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:bg-indigo-950/50">Fixo</Badge>
                        ) : (
                          <Badge className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">Variável</Badge>
                        )}
                        {inc.dueDate && (
                          <span className="text-[10px] text-muted-foreground">{formatShortDate(inc.dueDate)}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {renderCurrencyEditor(inc, "expected")}
                    </TableCell>
                    <TableCell className="text-right">
                      {renderCurrencyEditor(inc, "received")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
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
                <TableCell className="text-base">Total</TableCell>
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
