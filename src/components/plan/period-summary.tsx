import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { PeriodSummary as PeriodSummaryType } from "@/lib/calculations"

interface PeriodSummaryProps {
  label: string
  summary: PeriodSummaryType
  showEntryBalance?: boolean
  isFinal?: boolean
}

export function PeriodSummary({
  label,
  summary,
  showEntryBalance,
  isFinal,
}: PeriodSummaryProps) {
  const isPositive = summary.balance >= 0

  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
          Resumo {label}
        </h4>
        <div className="space-y-1.5 text-sm">
          {showEntryBalance && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saldo Anterior</span>
              <span className="font-mono">
                {formatCurrency(summary.entryBalance)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Receitas</span>
            <span className="font-mono text-emerald-600">
              +{formatCurrency(summary.totalIncome)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Despesas</span>
            <span className="font-mono text-red-500">
              -{formatCurrency(summary.totalExpenses)}
            </span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-semibold">
              <span>{isFinal ? "Saldo Final do Mês" : "Saldo"}</span>
              <span
                className={cn(
                  "font-mono text-base",
                  isPositive ? "text-emerald-600" : "text-red-500"
                )}
              >
                {formatCurrency(summary.balance)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
