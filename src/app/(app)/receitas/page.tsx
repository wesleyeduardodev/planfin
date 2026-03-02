"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface IncomeSource {
  id: string
  description: string
  amount: number
  period: number
  isActive: boolean
}

interface Receivable {
  id: string
  debtor: string
  installment: number
  totalInstall: number
  paidInstall: number
  period: number
  isActive: boolean
}

export default function ReceitasPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState("salarios")

  // Income Sources state
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false)
  const [deleteIncomeId, setDeleteIncomeId] = useState<string | null>(null)
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(null)
  const [incomeForm, setIncomeForm] = useState({
    description: "",
    amount: 0,
    period: 1,
    isActive: true,
  })

  // Receivables state
  const [recDialogOpen, setRecDialogOpen] = useState(false)
  const [deleteRecId, setDeleteRecId] = useState<string | null>(null)
  const [editingRec, setEditingRec] = useState<Receivable | null>(null)
  const [recForm, setRecForm] = useState({
    debtor: "",
    installment: 0,
    totalInstall: 1,
    paidInstall: 0,
    period: 1,
    isActive: true,
  })

  const { data: incomeSources = [], isLoading: loadingIncome } = useQuery<
    IncomeSource[]
  >({
    queryKey: ["income-sources"],
    queryFn: () => fetch("/api/income-sources").then((r) => r.json()),
  })

  const { data: receivables = [], isLoading: loadingRec } = useQuery<
    Receivable[]
  >({
    queryKey: ["receivables"],
    queryFn: () => fetch("/api/receivables").then((r) => r.json()),
  })

  // Income mutations
  const saveIncomeMutation = useMutation({
    mutationFn: async (data: typeof incomeForm) => {
      const url = editingIncome
        ? `/api/income-sources/${editingIncome.id}`
        : "/api/income-sources"
      const res = await fetch(url, {
        method: editingIncome ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income-sources"] })
      setIncomeDialogOpen(false)
      setEditingIncome(null)
      toast.success(editingIncome ? "Receita atualizada" : "Receita criada")
    },
    onError: () => toast.error("Erro ao salvar receita"),
  })

  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/income-sources/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income-sources"] })
      setDeleteIncomeId(null)
      toast.success("Receita excluída")
    },
    onError: () => toast.error("Erro ao excluir"),
  })

  // Receivable mutations
  const saveRecMutation = useMutation({
    mutationFn: async (data: typeof recForm) => {
      const url = editingRec
        ? `/api/receivables/${editingRec.id}`
        : "/api/receivables"
      const res = await fetch(url, {
        method: editingRec ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] })
      setRecDialogOpen(false)
      setEditingRec(null)
      toast.success(editingRec ? "Recebível atualizado" : "Recebível criado")
    },
    onError: () => toast.error("Erro ao salvar recebível"),
  })

  const deleteRecMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/receivables/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] })
      setDeleteRecId(null)
      toast.success("Recebível excluído")
    },
    onError: () => toast.error("Erro ao excluir"),
  })

  return (
    <>
      <PageHeader
        title="Receitas"
        description="Gerencie fontes de renda fixa e valores a receber"
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="salarios">Salários / Renda Fixa</TabsTrigger>
          <TabsTrigger value="recebiveis">Recebíveis</TabsTrigger>
        </TabsList>

        {/* Income Sources Tab */}
        <TabsContent value="salarios" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                setEditingIncome(null)
                setIncomeForm({
                  description: "",
                  amount: 0,
                  period: 1,
                  isActive: true,
                })
                setIncomeDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova Receita
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingIncome ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : incomeSources.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma fonte de receita cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  incomeSources.map((src) => (
                    <TableRow
                      key={src.id}
                      className={!src.isActive ? "opacity-50" : ""}
                    >
                      <TableCell className="font-medium">
                        {src.description}
                      </TableCell>
                      <TableCell>Período {src.period}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(src.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={src.isActive ? "default" : "secondary"}
                        >
                          {src.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingIncome(src)
                              setIncomeForm({
                                description: src.description,
                                amount: src.amount,
                                period: src.period,
                                isActive: src.isActive,
                              })
                              setIncomeDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteIncomeId(src.id)}
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
        </TabsContent>

        {/* Receivables Tab */}
        <TabsContent value="recebiveis" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                setEditingRec(null)
                setRecForm({
                  debtor: "",
                  installment: 0,
                  totalInstall: 1,
                  paidInstall: 0,
                  period: 1,
                  isActive: true,
                })
                setRecDialogOpen(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Novo Recebível
            </Button>
          </div>

          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Devedor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Parcela</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRec ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : receivables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum recebível cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  receivables.map((rec) => (
                    <TableRow
                      key={rec.id}
                      className={!rec.isActive ? "opacity-50" : ""}
                    >
                      <TableCell className="font-medium">
                        {rec.debtor}
                      </TableCell>
                      <TableCell>Período {rec.period}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(rec.installment)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {rec.paidInstall}/{rec.totalInstall} parcelas
                        </span>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div
                            className="bg-primary rounded-full h-1.5"
                            style={{
                              width: `${(rec.paidInstall / rec.totalInstall) * 100}%`,
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rec.isActive ? "default" : "secondary"}
                        >
                          {rec.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingRec(rec)
                              setRecForm({
                                debtor: rec.debtor,
                                installment: rec.installment,
                                totalInstall: rec.totalInstall,
                                paidInstall: rec.paidInstall,
                                period: rec.period,
                                isActive: rec.isActive,
                              })
                              setRecDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteRecId(rec.id)}
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
        </TabsContent>
      </Tabs>

      {/* Income Dialog */}
      <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingIncome ? "Editar Receita" : "Nova Receita"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveIncomeMutation.mutate(incomeForm)
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={incomeForm.description}
                onChange={(e) =>
                  setIncomeForm({ ...incomeForm, description: e.target.value })
                }
                placeholder="Ex: Salário CVC"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor</Label>
                <CurrencyInput
                  value={incomeForm.amount}
                  onChange={(v) => setIncomeForm({ ...incomeForm, amount: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={String(incomeForm.period)}
                  onValueChange={(v) =>
                    setIncomeForm({ ...incomeForm, period: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Período 1</SelectItem>
                    <SelectItem value="2">Período 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={incomeForm.isActive}
                onChange={(e) =>
                  setIncomeForm({ ...incomeForm, isActive: e.target.checked })
                }
                className="rounded"
              />
              Ativo
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIncomeDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveIncomeMutation.isPending}>
                {saveIncomeMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receivable Dialog */}
      <Dialog open={recDialogOpen} onOpenChange={setRecDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRec ? "Editar Recebível" : "Novo Recebível"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveRecMutation.mutate(recForm)
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Devedor</Label>
              <Input
                value={recForm.debtor}
                onChange={(e) =>
                  setRecForm({ ...recForm, debtor: e.target.value })
                }
                placeholder="Nome de quem deve"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor da Parcela</Label>
                <CurrencyInput
                  value={recForm.installment}
                  onChange={(v) => setRecForm({ ...recForm, installment: v })}
                />
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select
                  value={String(recForm.period)}
                  onValueChange={(v) =>
                    setRecForm({ ...recForm, period: parseInt(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Período 1</SelectItem>
                    <SelectItem value="2">Período 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total de Parcelas</Label>
                <Input
                  type="number"
                  min={1}
                  value={recForm.totalInstall}
                  onChange={(e) =>
                    setRecForm({
                      ...recForm,
                      totalInstall: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Parcelas Pagas</Label>
                <Input
                  type="number"
                  min={0}
                  max={recForm.totalInstall}
                  value={recForm.paidInstall}
                  onChange={(e) =>
                    setRecForm({
                      ...recForm,
                      paidInstall: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={recForm.isActive}
                onChange={(e) =>
                  setRecForm({ ...recForm, isActive: e.target.checked })
                }
                className="rounded"
              />
              Ativo
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRecDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveRecMutation.isPending}>
                {saveRecMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialogs */}
      <ConfirmDialog
        open={!!deleteIncomeId}
        onOpenChange={() => setDeleteIncomeId(null)}
        title="Excluir Receita"
        description="Tem certeza que deseja excluir esta fonte de receita?"
        onConfirm={() =>
          deleteIncomeId && deleteIncomeMutation.mutate(deleteIncomeId)
        }
        loading={deleteIncomeMutation.isPending}
      />
      <ConfirmDialog
        open={!!deleteRecId}
        onOpenChange={() => setDeleteRecId(null)}
        title="Excluir Recebível"
        description="Tem certeza que deseja excluir este recebível?"
        onConfirm={() => deleteRecId && deleteRecMutation.mutate(deleteRecId)}
        loading={deleteRecMutation.isPending}
      />
    </>
  )
}
