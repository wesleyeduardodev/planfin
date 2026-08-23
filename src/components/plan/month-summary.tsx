import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"

interface MonthSummaryProps {
  expenses: { plannedAmount: number; averageAmount: number | null; isFixed: boolean; paymentMethod?: "CASH" | "CARD" }[]
  incomes: { expectedAmount: number; averageAmount: number | null; isFixed: boolean }[]
}

export function MonthSummary({ expenses, incomes }: MonthSummaryProps) {
  const expenseFixed = expenses.reduce((s, e) => s + (e.isFixed ? e.plannedAmount : 0), 0)
  const expenseTotal = expenses.reduce((s, e) => s + e.plannedAmount, 0)
  const expenseVariable = expenseTotal - expenseFixed
  const expenseAverage = expenses.reduce((s, e) => s + (e.averageAmount ?? 0), 0)
  const expenseCard = expenses.reduce((s, e) => s + (e.paymentMethod === "CARD" ? e.plannedAmount : 0), 0)
  const expenseCash = expenseTotal - expenseCard

  const incomeFixed = incomes.reduce((s, i) => s + (i.isFixed ? i.expectedAmount : 0), 0)
  const incomeTotal = incomes.reduce((s, i) => s + i.expectedAmount, 0)
  const incomeVariable = incomeTotal - incomeFixed
  const incomeAverage = incomes.reduce((s, i) => s + (i.averageAmount ?? 0), 0)

  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-2.5 border-b bg-muted/50">
        <h4 className="text-sm font-bold tracking-wide uppercase text-muted-foreground">
          Resumo do Mês — Fixo x Variável
        </h4>
      </div>
      <CardContent className="pt-4 pb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Coluna: Despesas */}
          <div className="flex flex-col gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
              Despesas
            </span>
            <div className="flex justify-between items-center">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Fixo</span>
              <span className="font-mono font-semibold">
                {formatCurrency(expenseFixed)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-600 dark:text-amber-400 font-medium">Variável</span>
              <span className="font-mono font-semibold">
                {formatCurrency(expenseVariable)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Médio</span>
              <span className="font-mono font-semibold text-muted-foreground">
                {formatCurrency(expenseAverage)}
              </span>
            </div>
            <div className="border-t pt-2 mt-2 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Dinheiro</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(expenseCash)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-violet-600 dark:text-violet-400 font-medium">Cartão</span>
                <span className="font-mono font-semibold">
                  {formatCurrency(expenseCard)}
                </span>
              </div>
            </div>
            <div className="border-t-2 pt-3 mt-auto border-red-200 dark:border-red-900">
              <div className="flex justify-between items-center">
                <span className="font-bold text-base">Total</span>
                <span className="font-mono font-bold text-xl text-red-500">
                  {formatCurrency(expenseTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Coluna: Receitas */}
          <div className="flex flex-col gap-2 text-sm sm:border-l sm:pl-6">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Receitas
            </span>
            <div className="flex justify-between items-center">
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Fixo</span>
              <span className="font-mono font-semibold">
                {formatCurrency(incomeFixed)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-amber-600 dark:text-amber-400 font-medium">Variável</span>
              <span className="font-mono font-semibold">
                {formatCurrency(incomeVariable)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Médio</span>
              <span className="font-mono font-semibold text-muted-foreground">
                {formatCurrency(incomeAverage)}
              </span>
            </div>
            <div className="border-t-2 pt-3 mt-auto border-emerald-200 dark:border-emerald-900">
              <div className="flex justify-between items-center">
                <span className="font-bold text-base">Total</span>
                <span className="font-mono font-bold text-xl text-emerald-600">
                  {formatCurrency(incomeTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
