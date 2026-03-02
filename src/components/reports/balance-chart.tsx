"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { getMonthName } from "@/lib/format"

interface BalanceChartProps {
  data: {
    year: number
    month: number
    balance: number
    realBalance?: number
    totalIncome: number
    totalExpenses: number
  }[]
}

export function BalanceChart({ data }: BalanceChartProps) {
  const hasRealBalance = data.some((d) => d.realBalance !== undefined)

  const chartData = data.map((d) => ({
    name: `${getMonthName(d.month).slice(0, 3)}/${d.year.toString().slice(2)}`,
    saldoProjetado: d.balance,
    ...(hasRealBalance && { saldoReal: d.realBalance }),
    receitas: d.totalIncome,
    despesas: d.totalExpenses,
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="name"
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "hsl(var(--muted-foreground))" }}
          tickFormatter={(v) =>
            `R$ ${(v / 1000).toFixed(0)}k`
          }
        />
        <Tooltip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any) =>
            new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(Number(value) || 0)
          }
          contentStyle={{
            backgroundColor: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        {hasRealBalance && <Legend />}
        <Line
          type="monotone"
          dataKey="saldoProjetado"
          stroke="#10b981"
          strokeWidth={hasRealBalance ? 1.5 : 2}
          strokeDasharray={hasRealBalance ? "5 5" : undefined}
          dot={{ fill: "#10b981" }}
          name="Saldo Projetado"
        />
        {hasRealBalance && (
          <Line
            type="monotone"
            dataKey="saldoReal"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6" }}
            name="Saldo Real"
          />
        )}
        <Line
          type="monotone"
          dataKey="receitas"
          stroke="#10b981"
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={false}
          name="Receitas"
          opacity={0.5}
        />
        <Line
          type="monotone"
          dataKey="despesas"
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={false}
          name="Despesas"
          opacity={0.5}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
