"use client"

import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Scale } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CurrencyInput } from "@/components/shared/currency-input"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

interface Preview {
  period: number
  currentRealBalance: number
  informedBalance: number
  diff: number
  kind: "income" | "expense" | "none"
  amount: number
  description: string
}

interface AlignBalanceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  year: number
  month: number
}

// Data de hoje no fuso de Fortaleza (America/Fortaleza, UTC-3 sem horário de verão)
function todayInFortaleza(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get("year"), month: get("month"), day: get("day") }
}

// Hoje se o plano for do mês atual; senão o último dia do mês do plano
function todayInMonth(year: number, month: number): string {
  const today = todayInFortaleza()
  const inMonth = today.year === year && today.month === month
  const day = inMonth ? today.day : new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function AlignBalanceDialog({ open, onOpenChange, planId, year, month }: AlignBalanceDialogProps) {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(() => todayInMonth(year, month))
  const [balance, setBalance] = useState(0)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const minDate = `${year}-${String(month).padStart(2, "0")}-01`
  const maxDate = `${year}-${String(month).padStart(2, "0")}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`

  useEffect(() => {
    if (open) {
      setDate(todayInMonth(year, month))
      setBalance(0)
      setPreview(null)
    }
  }, [open, year, month])

  // Preview com debounce sempre que data/saldo mudam
  useEffect(() => {
    if (!open || !date) return
    let cancelled = false
    setLoadingPreview(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/plans/${planId}/align-balance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, balance, dryRun: true }),
        })
        if (!cancelled) setPreview(res.ok ? await res.json() : null)
      } catch {
        if (!cancelled) setPreview(null)
      } finally {
        if (!cancelled) setLoadingPreview(false)
      }
    }, 350)
    return () => { cancelled = true; clearTimeout(t) }
  }, [open, date, balance, planId])

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/plans/${planId}/align-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, balance }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Erro")
      return res.json() as Promise<Preview & { created?: boolean }>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["plan", year, month] })
      onOpenChange(false)
      toast.success(
        data.kind === "income"
          ? `Entrada de ${formatCurrency(data.amount)} criada no Período ${data.period}`
          : `Despesa de ${formatCurrency(data.amount)} criada no Período ${data.period}`
      )
    },
    onError: (e: Error) => toast.error(e.message || "Erro ao alinhar saldo"),
  })

  const canSubmit = preview != null && preview.kind !== "none" && !loadingPreview && !mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" /> Alinhar saldo em conta
          </DialogTitle>
          <DialogDescription>
            Informe o saldo real da sua conta. Será criado um lançamento já pago/recebido
            para igualar o saldo real do período à sua conta.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate() }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Saldo em conta</Label>
              <CurrencyInput value={balance} onChange={setBalance} />
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1.5 min-h-[96px]">
            {loadingPreview && !preview ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculando…
              </div>
            ) : preview ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Período da data</span>
                  <span className="font-semibold">Período {preview.period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo real hoje no app</span>
                  <span className="font-mono">{formatCurrency(preview.currentRealBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo informado</span>
                  <span className="font-mono">{formatCurrency(preview.informedBalance)}</span>
                </div>
                <div className="border-t pt-1.5 mt-1.5">
                  {preview.kind === "none" ? (
                    <span className="text-emerald-600 font-medium">Saldo já está alinhado — nada a criar.</span>
                  ) : (
                    <span>
                      Será criada uma{" "}
                      <span className={cn("font-semibold", preview.kind === "income" ? "text-emerald-600" : "text-red-500")}>
                        {preview.kind === "income" ? "entrada recebida" : "despesa paga"} de {formatCurrency(preview.amount)}
                      </span>{" "}
                      no Período {preview.period}.
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-muted-foreground">Informe uma data dentro do mês.</span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Dica: itens já marcados como pagos/recebidos mas que ainda não saíram da conta vão distorcer o
            cálculo — confira o preview antes de confirmar. Depois você pode renomear o lançamento.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={!canSubmit}>
              {mutation.isPending ? "Criando..." : "Criar ajuste"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
