"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/shared/currency-input"

interface AddIncomeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  period: number
  year: number
  month: number
}

export function AddIncomeDialog({
  open,
  onOpenChange,
  planId,
  period,
  year,
  month,
}: AddIncomeDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    description: "",
    expectedAmount: 0,
    dueDate: "",
    isFixed: true,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/plans/incomes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          period,
          description: form.description,
          expectedAmount: form.expectedAmount,
          dueDate: form.dueDate || null,
          isFixed: form.isFixed,
        }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      onOpenChange(false)
      setForm({ description: "", expectedAmount: 0, dueDate: "", isFixed: true })
      toast.success("Receita adicionada")
    },
    onError: () => toast.error("Erro ao adicionar receita"),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Entrada - Período {period}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Ex: Fernanda, 13°, Férias..."
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Valor Esperado</Label>
            <CurrencyInput
              value={form.expectedAmount}
              onChange={(v) => setForm({ ...form, expectedAmount: v })}
            />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFixed}
              onChange={(e) => setForm({ ...form, isFixed: e.target.checked })}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm">Entrada fixa</span>
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
