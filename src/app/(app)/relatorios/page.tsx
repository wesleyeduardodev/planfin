"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts"
import { FileText, FileSpreadsheet, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { PageHeader } from "@/components/shared/page-header"
import { formatCurrency, getMonthName } from "@/lib/format"
import { cn } from "@/lib/utils"

interface ReportData {
  monthlySummary: {
    year: number
    month: number
    totalIncome: number
    totalExpenses: number
    totalPaid: number
    balance: number
    initialBalance: number
    [key: string]: number
  }[]
  categoryData: Record<
    string,
    Record<string, { total: number; color: string }>
  >
  categories: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const currencyFormatter = (value: any) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0)

function formatYAxis(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 10_000) return `R$ ${(value / 1_000).toFixed(0)}k`
  if (abs >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`
  return `R$ ${value.toFixed(0)}`
}

export default function RelatoriosPage() {
  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ["reports"],
    queryFn: () => fetch("/api/reports").then((r) => r.json()),
  })

  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null)

  const availableMonths = data?.monthlySummary.map((d) => ({
    key: `${d.year}-${String(d.month).padStart(2, "0")}`,
    label: `${getMonthName(d.month).slice(0, 3)}/${d.year}`,
  })) || []

  const allSelected = availableMonths.length > 0 && selectedMonths.size === availableMonths.length

  function toggleMonth(key: string) {
    setSelectedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedMonths(new Set())
    } else {
      setSelectedMonths(new Set(availableMonths.map((m) => m.key)))
    }
  }

  async function handleExport(format: "pdf" | "excel") {
    if (selectedMonths.size === 0) return
    setExporting(format)
    try {
      const monthsParam = allSelected ? "all" : Array.from(selectedMonths).join(",")
      const res = await fetch(`/api/export/${format}?months=${monthsParam}`)
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || "Erro ao exportar")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
        || `planfin-relatorio.${format === "pdf" ? "pdf" : "xlsx"}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // toast would be nice but keeping it simple
      alert("Erro ao exportar. Tente novamente.")
    } finally {
      setExporting(null)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando relatórios...
      </div>
    )
  }

  if (!data || data.monthlySummary.length === 0) {
    return (
      <>
        <PageHeader title="Relatórios" />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum dado disponível. Gere planos mensais para ver relatórios.
          </CardContent>
        </Card>
      </>
    )
  }

  // Detectar quantidade máxima de períodos nos dados (sem limite fixo)
  const maxPeriods = data.monthlySummary.reduce((max, d) => {
    let count = 0
    for (let p = 1; p <= 31; p++) {
      if (d[`p${p}Expenses`] !== undefined) count = p
    }
    return Math.max(max, count)
  }, 1)

  const periodColors = [
    "#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444",
    "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  ]

  const chartData = data.monthlySummary.map((d) => {
    const entry: Record<string, string | number> = {
      name: `${getMonthName(d.month).slice(0, 3)}/${d.year.toString().slice(2)}`,
      receitas: d.totalIncome,
      despesas: d.totalExpenses,
      saldo: d.balance,
    }
    for (let p = 1; p <= maxPeriods; p++) {
      entry[`p${p}`] = d[`p${p}Expenses`] ?? 0
    }
    return entry
  })

  // Category stacked bar data
  const categoryColors: Record<string, string> = {}
  const categoryChartData = data.monthlySummary.map((d) => {
    const key = `${d.year}-${String(d.month).padStart(2, "0")}`
    const monthCats = data.categoryData[key] || {}
    const entry: Record<string, string | number> = {
      name: `${getMonthName(d.month).slice(0, 3)}/${d.year.toString().slice(2)}`,
    }
    for (const cat of data.categories) {
      entry[cat] = monthCats[cat]?.total || 0
      if (monthCats[cat]?.color) {
        categoryColors[cat] = monthCats[cat].color
      }
    }
    return entry
  })

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Análise financeira e comparativos"
      />

      {/* Export section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Exportar Planejamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Selecione os meses:</p>
            <div className="flex flex-wrap gap-2">
              {availableMonths.map((m) => (
                <Badge
                  key={m.key}
                  variant={selectedMonths.has(m.key) ? "default" : "outline"}
                  className="cursor-pointer select-none text-sm px-3 py-1"
                  onClick={() => toggleMonth(m.key)}
                >
                  {m.label}
                </Badge>
              ))}
              <Badge
                variant={allSelected ? "default" : "outline"}
                className="cursor-pointer select-none text-sm px-3 py-1"
                onClick={toggleAll}
              >
                Todos
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              disabled={selectedMonths.size === 0 || exporting !== null}
              onClick={() => handleExport("pdf")}
            >
              {exporting === "pdf" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Baixar PDF
            </Button>
            <Button
              variant="outline"
              disabled={selectedMonths.size === 0 || exporting !== null}
              onClick={() => handleExport("excel")}
            >
              {exporting === "excel" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Baixar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Balance evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução do Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={formatYAxis} />
                <Tooltip formatter={currencyFormatter} />
                <Legend />
                <Line type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={2} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} name="Despesas" />
                <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2.5} name="Saldo" dot={{ fill: "#3b82f6" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={formatYAxis} />
                <Tooltip formatter={currencyFormatter} />
                <Legend />
                {data.categories.map((cat) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="categories"
                    fill={categoryColors[cat] || "#6b7280"}
                    name={cat}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Period comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Despesas por Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={formatYAxis} />
                <Tooltip formatter={currencyFormatter} />
                <Legend />
                {Array.from({ length: maxPeriods }, (_, i) => (
                  <Bar
                    key={`p${i + 1}`}
                    dataKey={`p${i + 1}`}
                    fill={periodColors[i] ?? "#6b7280"}
                    name={`Período ${i + 1}`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly summary table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo Mês a Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Receitas</TableHead>
                    <TableHead className="text-right">Despesas</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.monthlySummary.map((d) => (
                    <TableRow key={`${d.year}-${d.month}`}>
                      <TableCell className="font-medium">
                        {getMonthName(d.month)} {d.year}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">
                        {formatCurrency(d.totalIncome)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-500">
                        {formatCurrency(d.totalExpenses)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(d.totalPaid)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-mono font-semibold",
                          d.balance >= 0 ? "text-emerald-600" : "text-red-500"
                        )}
                      >
                        {formatCurrency(d.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
