"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { getMonthName } from "@/lib/format"

interface BalanceChartProps {
  data: {
    year: number
    month: number
    balance: number
    totalIncome: number
    totalExpenses: number
  }[]
}

export function BalanceChart({ data }: BalanceChartProps) {
  const chartData = data.map((d) => ({
    name: `${getMonthName(d.month).slice(0, 3)}/${d.year.toString().slice(2)}`,
    saldo: d.balance,
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
        <Line
          type="monotone"
          dataKey="saldo"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: "#10b981" }}
          name="Saldo"
        />
        <Line
          type="monotone"
          dataKey="receitas"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
          name="Receitas"
        />
        <Line
          type="monotone"
          dataKey="despesas"
          stroke="#ef4444"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
          name="Despesas"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
