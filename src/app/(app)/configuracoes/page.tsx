"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Save, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/shared/page-header"

interface Settings {
  id: string
  salaryDay1: number
  salaryDay2: number
}

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient()
  const [day1, setDay1] = useState(1)
  const [day2, setDay2] = useState(20)

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  })

  useEffect(() => {
    if (settings) {
      setDay1(settings.salaryDay1)
      setDay2(settings.salaryDay2)
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salaryDay1: day1, salaryDay2: day2 }),
      })
      if (!res.ok) throw new Error()
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      toast.success("Configurações salvas")
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  })

  async function exportCSV() {
    try {
      const res = await fetch("/api/export")
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `planfin-export-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Dados exportados com sucesso")
    } catch {
      toast.error("Erro ao exportar dados")
    }
  }

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
            <CardTitle className="text-base">Dias de Corte dos Períodos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure os dias que definem o início de cada período salarial.
              Estes valores são usados ao gerar novos planos mensais.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia Período 1 (Salário 1)</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={day1}
                  onChange={(e) => setDay1(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dia Período 2 (Salário 2)</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={day2}
                  onChange={(e) => setDay2(parseInt(e.target.value) || 20)}
                />
              </div>
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

        <Separator />

        {/* Export */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exportar Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Exporte todos os seus planos e despesas em formato CSV.
            </p>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
