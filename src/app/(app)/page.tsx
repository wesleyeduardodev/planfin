"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatShortDate, getMonthName } from "@/lib/format"
import { cn } from "@/lib/utils"
import { BalanceChart } from "@/components/reports/balance-chart"

interface DashboardData {
  currentSummary: {
    totalIncome: number
    totalExpenses: number
    totalPaid: number
    balance: number
    period1: { income: number; expenses: number; balance: number }
    period2: { income: number; expenses: number }
  } | null
  monthlyData: {
    year: number
    month: number
    totalIncome: number
    totalExpenses: number
    balance: number
  }[]
  upcomingExpenses: {
    id: string
    description: string
    dueDate: string
    plannedAmount: number
    paidAmount: number
    category: { name: string; color: string } | null
  }[]
  categoryBreakdown: {
    name: string
    color: string
    total: number
  }[]
}

export default function DashboardPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
  })

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando dashboard...
      </div>
    )
  }

  const summary = data?.currentSummary

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {getMonthName(month)} {year}
          </p>
        </div>
        <Button asChild>
          <Link href={`/planejamento/${year}/${month}`}>
            <Calendar className="mr-2 h-4 w-4" /> Ver Plano
          </Link>
        </Button>
      </div>

      {!summary ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhum plano gerado para este mês.
            </p>
            <Button asChild>
              <Link href={`/planejamento/${year}/${month}`}>
                Ir para Planejamento
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Receita Total
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Despesa Total
                </div>
                <p className="text-2xl font-bold text-red-500">
                  {formatCurrency(summary.totalExpenses)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Wallet className="h-4 w-4" />
                  Já Pago
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(summary.totalPaid)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {summary.totalExpenses > 0
                    ? `${Math.round((summary.totalPaid / summary.totalExpenses) * 100)}% do total`
                    : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Wallet className="h-4 w-4" />
                  Saldo Previsto
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    summary.balance >= 0
                      ? "text-emerald-600"
                      : "text-red-500"
                  )}
                >
                  {formatCurrency(summary.balance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Period comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Período 1
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receitas</span>
                  <span className="font-mono text-emerald-600">
                    {formatCurrency(summary.period1.income)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Despesas</span>
                  <span className="font-mono text-red-500">
                    {formatCurrency(summary.period1.expenses)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Saldo</span>
                  <span
                    className={cn(
                      "font-mono",
                      summary.period1.balance >= 0
                        ? "text-emerald-600"
                        : "text-red-500"
                    )}
                  >
                    {formatCurrency(summary.period1.balance)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Período 2
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receitas</span>
                  <span className="font-mono text-emerald-600">
                    {formatCurrency(summary.period2.income)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Despesas</span>
                  <span className="font-mono text-red-500">
                    {formatCurrency(summary.period2.expenses)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming expenses */}
          {data?.upcomingExpenses && data.upcomingExpenses.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Próximas Despesas (7 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.upcomingExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {exp.category && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: exp.category.color }}
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            {exp.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vence em {formatShortDate(exp.dueDate)}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-sm">
                        {formatCurrency(exp.plannedAmount - exp.paidAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Balance evolution chart */}
          {data?.monthlyData && data.monthlyData.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Evolução do Saldo
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/relatorios">
                      Ver mais <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <BalanceChart data={data.monthlyData} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
