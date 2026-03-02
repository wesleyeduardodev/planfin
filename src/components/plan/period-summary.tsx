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
  const isProjectedPositive = summary.balance >= 0
  const isRealPositive = summary.realBalance >= 0

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
      <CardContent className="pt-4 pb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Coluna: Projeção */}
          <div className="space-y-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Projeção
            </span>
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
              <span className="text-muted-foreground">Receitas</span>
              <span className="font-mono font-semibold text-emerald-600">
                +{formatCurrency(summary.totalIncome)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Despesas</span>
              <span className="font-mono font-semibold text-red-500">
                -{formatCurrency(summary.totalExpenses)}
              </span>
            </div>
            <div className={cn(
              "border-t-2 pt-3 mt-3",
              isProjectedPositive ? "border-emerald-200 dark:border-emerald-900" : "border-red-200 dark:border-red-900"
            )}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-base">
                  {isFinal ? "Saldo Projetado" : "Saldo"}
                </span>
                <span className={cn(
                  "font-mono font-bold text-xl",
                  isProjectedPositive ? "text-emerald-600" : "text-red-500"
                )}>
                  {formatCurrency(summary.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna: Real */}
          <div className="space-y-2 text-sm sm:border-l sm:pl-6">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Real
            </span>
            {showEntryBalance && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Saldo Anterior</span>
                <span className={cn(
                  "font-mono font-medium",
                  summary.realEntryBalance >= 0 ? "text-foreground" : "text-red-500"
                )}>
                  {formatCurrency(summary.realEntryBalance)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Recebido</span>
              <span className="font-mono font-semibold text-emerald-600">
                +{formatCurrency(summary.totalReceived)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pago</span>
              <span className="font-mono font-semibold text-red-500">
                -{formatCurrency(summary.totalPaid)}
              </span>
            </div>
            <div className={cn(
              "border-t-2 pt-3 mt-3",
              isRealPositive ? "border-emerald-200 dark:border-emerald-900" : "border-red-200 dark:border-red-900"
            )}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-base">
                  {isFinal ? "Saldo Real" : "Saldo"}
                </span>
                <span className={cn(
                  "font-mono font-bold text-xl",
                  isRealPositive ? "text-emerald-600" : "text-red-500"
                )}>
                  {formatCurrency(summary.realBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
