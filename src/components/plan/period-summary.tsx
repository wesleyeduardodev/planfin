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
    <Card className={cn(
      "overflow-hidden",
      isFinal && "ring-2 ring-primary/20"
    )}>
      <div className={cn(
        "px-6 py-2.5 border-b",
        isFinal
          ? "bg-primary/10 dark:bg-primary/20"
          : "bg-muted/50"
      )}>
        <h4 className={cn(
          "text-sm font-bold tracking-wide uppercase",
          isFinal ? "text-primary" : "text-muted-foreground"
        )}>
          Resumo {label}
        </h4>
      </div>
      <CardContent className="pt-4 pb-5 space-y-2">
        <div className="space-y-2 text-sm">
          {showEntryBalance && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Saldo Anterior</span>
              <span className={cn(
                "font-mono font-medium",
                summary.entryBalance >= 0 ? "text-foreground" : "text-red-500"
              )}>
                {formatCurrency(summary.entryBalance)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total Receitas</span>
            <span className="font-mono font-semibold text-emerald-600">
              +{formatCurrency(summary.totalIncome)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total Despesas</span>
            <span className="font-mono font-semibold text-red-500">
              -{formatCurrency(summary.totalExpenses)}
            </span>
          </div>
          <div className={cn(
            "border-t-2 pt-3 mt-3",
            isPositive ? "border-emerald-200 dark:border-emerald-900" : "border-red-200 dark:border-red-900"
          )}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-base">
                {isFinal ? "Saldo Final do Mês" : "Saldo"}
              </span>
              <span
                className={cn(
                  "font-mono font-bold text-xl",
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
