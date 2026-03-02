"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  ArrowRight,
  Wand2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatShortDate, getMonthName, nowBR } from "@/lib/format"
import { cn } from "@/lib/utils"
import { BalanceChart } from "@/components/reports/balance-chart"

interface PeriodData {
  period: number
  income: number
  expenses: number
  received: number
  paid: number
  balance: number
  realBalance: number
}

interface MonthPlan {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  totalReceived: number
  totalPaid: number
  balance: number
  realBalance: number
  initialBalance: number
  periods: PeriodData[]
  categoryBreakdown: { name: string; color: string; total: number }[]
}

interface DashboardData {
  monthlyData: MonthPlan[]
  upcomingExpenses: {
    id: string
    description: string
    dueDate: string
    plannedAmount: number
    paidAmount: number
    category: { name: string; color: string } | null
  }[]
}

export default function DashboardPage() {
  const { year, month } = nowBR()
  const [selectedYear, setSelectedYear] = useState(year)
  const [selectedMonth, setSelectedMonth] = useState(month)

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

  const hasAnyPlan = data?.monthlyData && data.monthlyData.length > 0
  const selectedPlan = data?.monthlyData.find(
    (p) => p.year === selectedYear && p.month === selectedMonth
  )
  // If selected month has no plan, try current month, then first available
  const activePlan = selectedPlan
    ?? data?.monthlyData.find((p) => p.year === year && p.month === month)
    ?? data?.monthlyData[0]
    ?? null

  function selectPlan(p: MonthPlan) {
    setSelectedYear(p.year)
    setSelectedMonth(p.month)
  }

  return (
    <div className="space-y-6">
      {/* A. Header */}
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

      {/* C. Onboarding - zero planos */}
      {!hasAnyPlan && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Wand2 className="h-12 w-12 mx-auto text-primary/60" />
            <div>
              <h2 className="text-lg font-semibold mb-1">Bem-vindo ao PlanFin!</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Comece criando o plano do mês e adicione suas despesas e receitas.
              </p>
            </div>
            <div className="flex items-center justify-center">
              <Button asChild>
                <Link href={`/planejamento/${year}/${month}`}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Criar Plano de {getMonthName(month)}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* B. Banner CTA - tem planos mas não do mês atual */}
      {hasAnyPlan && !data?.monthlyData.find((p) => p.year === year && p.month === month) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Plano de <span className="font-semibold">{getMonthName(month)} {year}</span> ainda não foi criado
          </p>
          <Button size="sm" asChild>
            <Link href={`/planejamento/${year}/${month}`}>
              Criar Plano
            </Link>
          </Button>
        </div>
      )}

      {/* D. Resumo do mês selecionado */}
      {activePlan && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {getMonthName(activePlan.month)} {activePlan.year}
            </h2>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/planejamento/${activePlan.year}/${activePlan.month}`}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Ir para Planejamento
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Receitas
                </div>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(activePlan.totalIncome)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recebido: <span className="font-mono font-medium text-foreground">{formatCurrency(activePlan.totalReceived)}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Despesas
                </div>
                <p className="text-2xl font-bold text-red-500">
                  {formatCurrency(activePlan.totalExpenses)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pago: <span className="font-mono font-medium text-foreground">{formatCurrency(activePlan.totalPaid)}</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Progresso
                </div>
                <p className="text-2xl font-bold">
                  {activePlan.totalExpenses > 0
                    ? `${Math.round((activePlan.totalPaid / activePlan.totalExpenses) * 100)}%`
                    : "0%"}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${activePlan.totalExpenses > 0 ? Math.min(100, Math.round((activePlan.totalPaid / activePlan.totalExpenses) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Wallet className="h-4 w-4" />
                  Saldo
                </div>
                <div className="flex items-baseline gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Projetado</p>
                    <p className={cn(
                      "text-lg font-bold font-mono",
                      activePlan.balance >= 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {formatCurrency(activePlan.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Real</p>
                    <p className={cn(
                      "text-lg font-bold font-mono",
                      activePlan.realBalance >= 0 ? "text-emerald-600" : "text-red-500"
                    )}>
                      {formatCurrency(activePlan.realBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Period comparison */}
          {activePlan.periods.length > 0 && (
            <div
              className="grid grid-cols-1 gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(activePlan.periods.length, 3)}, minmax(0, 1fr))`,
              }}
            >
              {activePlan.periods.map((pd) => (
                <Card key={pd.period}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Período {pd.period}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Receitas</span>
                      <span className="font-mono text-emerald-600">
                        {formatCurrency(pd.income)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Despesas</span>
                      <span className="font-mono text-red-500">
                        {formatCurrency(pd.expenses)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground text-xs">Projetado</span>
                      <span className={cn(
                        "font-mono font-semibold",
                        pd.balance >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        {formatCurrency(pd.balance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">Real</span>
                      <span className={cn(
                        "font-mono font-semibold",
                        pd.realBalance >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        {formatCurrency(pd.realBalance)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* E. Seus Planos - cards clicáveis que atualizam o dashboard */}
      {hasAnyPlan && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Seus Planos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data!.monthlyData.map((plan) => {
              const isCurrent = plan.year === year && plan.month === month
              const isSelected = activePlan?.year === plan.year && activePlan?.month === plan.month
              const paidPercent = plan.totalExpenses > 0
                ? Math.round((plan.totalPaid / plan.totalExpenses) * 100)
                : 0

              return (
                <button
                  key={`${plan.year}-${plan.month}`}
                  onClick={() => selectPlan(plan)}
                  className={cn(
                    "block w-full text-left rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors cursor-pointer",
                    isSelected && "ring-2 ring-primary bg-accent/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">
                      {getMonthName(plan.month)} {plan.year}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isCurrent && (
                        <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary">
                          Atual
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Projetado</span>
                      <span className={cn(
                        "font-mono font-medium",
                        plan.balance >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        {formatCurrency(plan.balance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Real</span>
                      <span className={cn(
                        "font-mono font-medium",
                        plan.realBalance >= 0 ? "text-emerald-600" : "text-red-500"
                      )}>
                        {formatCurrency(plan.realBalance)}
                      </span>
                    </div>
                    <div className="pt-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Pago</span>
                        <span>{Math.min(100, paidPercent)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.min(100, paidPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* F. Upcoming expenses */}
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

      {/* G. Balance evolution chart */}
      {data?.monthlyData && data.monthlyData.length >= 2 && (
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

      {/* H. Category breakdown do mês selecionado */}
      {activePlan && activePlan.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Despesas por Categoria — {getMonthName(activePlan.month)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activePlan.categoryBreakdown.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm">{cat.name}</span>
                  </div>
                  <span className="font-mono text-sm">
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
