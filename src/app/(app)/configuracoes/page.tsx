"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Save, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"

interface Settings {
  id: string
  periodCount: number
  periodDays: number[]
}

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient()
  const [periodDays, setPeriodDays] = useState<number[]>([1, 20])

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  })

  useEffect(() => {
    if (settings) {
      setPeriodDays(settings.periodDays)
    }
  }, [settings])

  function addPeriod() {
    const count = periodDays.length + 1
    // Calcular dia default dividindo o mês uniformemente
    const step = Math.floor(30 / count)
    const newDay = Math.min((periodDays[periodDays.length - 1] ?? 1) + step, 28)
    // Garantir que não duplica
    const finalDay = periodDays.includes(newDay) ? newDay + 1 : newDay
    setPeriodDays([...periodDays, Math.min(finalDay, 31)])
  }

  function removePeriod(index: number) {
    if (periodDays.length <= 1) return
    setPeriodDays(periodDays.filter((_, i) => i !== index))
  }

  function handleDayChange(index: number, value: number) {
    const newDays = [...periodDays]
    newDays[index] = value
    setPeriodDays(newDays)
  }

  const periodCount = periodDays.length

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodCount, periodDays }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erro ao salvar")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast.success("Configurações salvas")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando...
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Ajuste as preferências do sistema"
      />

      <div className="max-w-2xl space-y-6">
        {/* Period settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Períodos do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Defina como dividir o mês em períodos. Cada período começa no dia
              configurado e vai até o dia anterior ao próximo período (o último
              vai até o fim do mês). Estes valores são usados ao gerar novos
              planos mensais.
            </p>

            <div className="space-y-3">
              {periodDays.map((day, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-sm">
                      Início do Período {i + 1}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={day}
                      onChange={(e) =>
                        handleDayChange(i, parseInt(e.target.value) || 1)
                      }
                      readOnly={i === 0}
                      className={i === 0 ? "bg-muted" : ""}
                    />
                  </div>
                  {i > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePeriod(i)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPeriod}
                className="mt-2"
              >
                <Plus className="mr-1 h-4 w-4" />
                Adicionar Período
              </Button>
            </div>

            <Button
              className="mt-4"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
