interface Expense {
  plannedAmount: number
  paidAmount: number
}

interface Income {
  expectedAmount: number
  receivedAmount: number
}

export function calcRemaining(expense: Expense): number {
  return expense.plannedAmount - expense.paidAmount
}

export function calcTotalPlanned(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.plannedAmount, 0)
}

export function calcTotalPaid(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.paidAmount, 0)
}

export function calcTotalRemaining(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + calcRemaining(e), 0)
}

export function calcTotalExpected(incomes: Income[]): number {
  return incomes.reduce((sum, i) => sum + i.expectedAmount, 0)
}

export function calcTotalReceived(incomes: Income[]): number {
  return incomes.reduce((sum, i) => sum + i.receivedAmount, 0)
}

export interface PeriodSummary {
  entryBalance: number
  totalExpenses: number
  totalPaid: number
  totalRemaining: number
  totalIncome: number
  totalReceived: number
  balance: number        // projeção: entryBalance + totalIncome - totalExpenses
  realEntryBalance: number
  realBalance: number    // real: realEntryBalance + totalReceived - totalPaid
}

export function calcPeriodSummary(
  entryBalance: number,
  expenses: Expense[],
  incomes: Income[],
  realEntryBalance?: number
): PeriodSummary {
  const totalExpenses = calcTotalPlanned(expenses)
  const totalPaid = calcTotalPaid(expenses)
  const totalRemaining = calcTotalRemaining(expenses)
  const totalIncome = calcTotalExpected(incomes)
  const totalReceived = calcTotalReceived(incomes)
  const balance = entryBalance + totalIncome - totalExpenses
  const realEntry = realEntryBalance ?? entryBalance
  const realBalance = realEntry + totalReceived - totalPaid

  return {
    entryBalance,
    totalExpenses,
    totalPaid,
    totalRemaining,
    totalIncome,
    totalReceived,
    balance,
    realEntryBalance: realEntry,
    realBalance,
  }
}
