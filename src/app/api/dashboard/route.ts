import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"
import { nowBR } from "@/lib/format"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const { year: currentYear, month: currentMonth, day: currentDay } = nowBR()

    // Current month plan
    const currentPlan = await prisma.monthlyPlan.findUnique({
      where: {
        userId_year_month: {
          userId: user.id,
          year: currentYear,
          month: currentMonth,
        },
      },
      include: {
        expenses: { include: { category: true } },
        incomes: true,
      },
    })

    // Last 6 months plans for chart
    const plans = await prisma.monthlyPlan.findMany({
      where: { userId: user.id },
      include: { expenses: true, incomes: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
    })

    // Upcoming expenses (next 7 days)
    const todayUTC = Date.UTC(currentYear, currentMonth - 1, currentDay, 0, 0, 0)
    const in7DaysUTC = todayUTC + 7 * 24 * 60 * 60 * 1000

    const upcomingExpenses = currentPlan
      ? currentPlan.expenses
          .filter((e) => {
            if (!e.dueDate) return false
            const due = new Date(e.dueDate).getTime()
            return due >= todayUTC && due <= in7DaysUTC && e.paidAmount < e.plannedAmount
          })
          .sort(
            (a, b) =>
              new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
          )
          .slice(0, 5)
      : []

    // Calculate summaries for last 6 months
    const monthlyData = plans.reverse().map((plan) => {
      const totalIncome = plan.incomes.reduce(
        (s, i) => s + i.expectedAmount,
        0
      )
      const totalExpenses = plan.expenses.reduce(
        (s, e) => s + e.plannedAmount,
        0
      )
      const balance = plan.initialBalance + totalIncome - totalExpenses

      return {
        year: plan.year,
        month: plan.month,
        totalIncome,
        totalExpenses,
        balance,
        initialBalance: plan.initialBalance,
      }
    })

    // Current month summary with dynamic periods
    let currentSummary = null
    if (currentPlan) {
      const totalIncome = currentPlan.incomes.reduce(
        (s, i) => s + i.expectedAmount,
        0
      )
      const totalExpenses = currentPlan.expenses.reduce(
        (s, e) => s + e.plannedAmount,
        0
      )
      const totalPaid = currentPlan.expenses.reduce(
        (s, e) => s + e.paidAmount,
        0
      )

      const periodCount = currentPlan.cutDays.length
      const periods = []
      let balance = currentPlan.initialBalance

      for (let p = 1; p <= periodCount; p++) {
        const income = currentPlan.incomes
          .filter((i) => i.period === p)
          .reduce((s, i) => s + i.expectedAmount, 0)
        const expenses = currentPlan.expenses
          .filter((e) => e.period === p)
          .reduce((s, e) => s + e.plannedAmount, 0)
        const periodBalance = balance + income - expenses
        periods.push({ period: p, income, expenses, balance: periodBalance })
        balance = periodBalance
      }

      currentSummary = {
        totalIncome,
        totalExpenses,
        totalPaid,
        balance: currentPlan.initialBalance + totalIncome - totalExpenses,
        periods,
      }
    }

    // Expenses by category for current month
    const categoryBreakdown = currentPlan
      ? Object.values(
          currentPlan.expenses.reduce(
            (acc, e) => {
              const key = e.category?.name || "Sem Categoria"
              const color = e.category?.color || "#6b7280"
              if (!acc[key]) acc[key] = { name: key, color, total: 0 }
              acc[key].total += e.plannedAmount
              return acc
            },
            {} as Record<string, { name: string; color: string; total: number }>
          )
        )
      : []

    return NextResponse.json({
      currentSummary,
      monthlyData,
      upcomingExpenses,
      categoryBreakdown,
    })
  } catch (error) {
    return serverError(error)
  }
}
