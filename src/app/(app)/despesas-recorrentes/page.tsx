"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { CurrencyInput } from "@/components/shared/currency-input"
import { formatCurrency } from "@/lib/format"
import { getPeriodLabel } from "@/lib/periods"

interface Category {
  id: string
  name: string
  color: string
}

interface RecurringExpense {
  id: string
  description: string
  amount: number
  period: number
  dueDay: number | null
  isVariable: boolean
  isActive: boolean
  categoryId: string
  category: Category
}

interface Settings {
  periodCount: number
  periodDays: number[]
}

const emptyForm = {
  description: "",
  amount: 0,
  period: 1,
  dueDay: null as number | null,
  isVariable: false,
  isActive: true,
  categoryId: "",
}

export default function DespesasRecorrentesPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editing, setEditing] = useState<RecurringExpense | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: expenses = [], isLoading } = useQuery<RecurringExpense[]>({
    queryKey: ["recurring-expenses"],
    queryFn: () => fetch("/api/recurring-expenses").then((r) => r.json()),
  })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  })

  const { data: settings } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  })

  const periodCount = settings?.periodCount ?? 2
  const periodDays = settings?.periodDays ?? [1, 20]

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const url = editing
        ? `/api/recurring-expenses/${editing.id}`
        : "/api/recurring-expenses"
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] })
      setDialogOpen(false)
      setEditing(null)
      toast.success(editing ? "Despesa atualizada" : "Despesa criada")
    },
    onError: () => toast.error("Erro ao salvar despesa"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recurring-expenses/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erro ao excluir")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] })
      setDeleteId(null)
      toast.success("Despesa excluída")
    },
    onError: () => toast.error("Erro ao excluir despesa"),
  })

  function openNew() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(exp: RecurringExpense) {
    setEditing(exp)
    setForm({
      description: exp.description,
      amount: exp.amount,
      period: exp.period,
      dueDay: exp.dueDay,
      isVariable: exp.isVariable,
      isActive: exp.isActive,
      categoryId: exp.categoryId,
    })
    setDialogOpen(true)
  }

  function renderTable(items: RecurringExpense[], period: number) {
    const label = getPeriodLabel(periodDays, period, 31)
    return (
      <div key={period} className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold">{label}</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-20">Dia</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Nenhuma despesa no período {period}
                </TableCell>
              </TableRow>
            ) : (
              items.map((exp) => (
                <TableRow key={exp.id} className={!exp.isActive ? "opacity-50" : ""}>
                  <TableCell className="font-medium">
                    {exp.description}
                    {exp.isVariable && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Variável
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: exp.category?.color }}
                      />
                      {exp.category?.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(exp.amount)}
                  </TableCell>
                  <TableCell>{exp.dueDay ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={exp.isActive ? "default" : "secondary"}>
                      {exp.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(exp)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(exp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Despesas Recorrentes"
        description="Despesas que se repetem todo mês e são preenchidas automaticamente ao gerar um plano"
        action={
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nova Despesa
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-6">
          {Array.from({ length: periodCount }, (_, i) => {
            const p = i + 1
            const items = expenses.filter((e) => e.period === p)
            return renderTable(items, p)
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Despesa Recorrente" : "Nova Despesa Recorrente"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveMutation.mutate(form)
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
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Padrão</Label>
                <CurrencyInput
                  value={form.amount}
                  onChange={(v) => setForm({ ...form, amount: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={String(form.period)}
                  onValueChange={(v) =>
                    setForm({ ...form, period: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: periodCount }, (_, i) => {
                      const p = i + 1
                      return (
                        <SelectItem key={p} value={String(p)}>
                          {getPeriodLabel(periodDays, p, 31)}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dia de Vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dueDay ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dueDay: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isVariable}
                  onChange={(e) =>
                    setForm({ ...form, isVariable: e.target.checked })
                  }
                  className="rounded"
                />
                Valor variável (cartão de crédito)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="rounded"
                />
                Ativo
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Excluir Despesa Recorrente"
        description="Tem certeza que deseja excluir esta despesa recorrente?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
