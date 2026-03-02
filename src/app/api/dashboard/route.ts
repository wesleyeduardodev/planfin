import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"
import { nowBR } from "@/lib/format"
import { calcPeriodSummary } from "@/lib/calculations"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const { year: currentYear, month: currentMonth, day: currentDay } = nowBR()

    // All plans
    const plans = await prisma.monthlyPlan.findMany({
      where: { userId: user.id },
      include: {
        expenses: { include: { category: true } },
        incomes: true,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    })

    // Upcoming expenses cross-plan (next 7 days)
    const todayUTC = Date.UTC(currentYear, currentMonth - 1, currentDay, 0, 0, 0)
    const in7DaysUTC = todayUTC + 7 * 24 * 60 * 60 * 1000

    const upcomingExpenses = plans
      .flatMap((plan) =>
        plan.expenses
          .filter((e) => {
            if (!e.dueDate) return false
            const due = new Date(e.dueDate).getTime()
            return due >= todayUTC && due <= in7DaysUTC && e.paidAmount < e.plannedAmount
          })
          .map((e) => ({
            id: e.id,
            description: e.description,
            dueDate: e.dueDate,
            plannedAmount: e.plannedAmount,
            paidAmount: e.paidAmount,
            category: e.category
              ? { name: e.category.name, color: e.category.color }
              : null,
          }))
      )
      .sort(
        (a, b) =>
          new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
      )
      .slice(0, 5)

    // Monthly data: totals + periods + categories per plan
    const monthlyData = plans.map((plan) => {
      const totalIncome = plan.incomes.reduce((s, i) => s + i.expectedAmount, 0)
      const totalExpenses = plan.expenses.reduce((s, e) => s + e.plannedAmount, 0)
      const totalReceived = plan.incomes.reduce((s, i) => s + i.receivedAmount, 0)
      const totalPaid = plan.expenses.reduce((s, e) => s + e.paidAmount, 0)

      // Period-level data
      const periodCount = plan.cutDays.length
      const periods = []
      let projectedEntry = plan.initialBalance
      let realEntry = plan.initialBalance

      for (let p = 1; p <= periodCount; p++) {
        const pExpenses = plan.expenses.filter((e) => e.period === p)
        const pIncomes = plan.incomes.filter((i) => i.period === p)
        const summary = calcPeriodSummary(projectedEntry, pExpenses, pIncomes, realEntry)

        periods.push({
          period: p,
          income: summary.totalIncome,
          expenses: summary.totalExpenses,
          received: summary.totalReceived,
          paid: summary.totalPaid,
          balance: summary.balance,
          realBalance: summary.realBalance,
        })

        projectedEntry = summary.balance
        realEntry = summary.realBalance
      }

      // Category breakdown
      const categoryBreakdown = Object.values(
        plan.expenses.reduce(
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

      return {
        year: plan.year,
        month: plan.month,
        totalIncome,
        totalExpenses,
        totalReceived,
        totalPaid,
        balance: plan.initialBalance + totalIncome - totalExpenses,
        realBalance: plan.initialBalance + totalReceived - totalPaid,
        initialBalance: plan.initialBalance,
        periods,
        categoryBreakdown,
      }
    })

    return NextResponse.json({
      monthlyData,
      upcomingExpenses,
    })
  } catch (error) {
    return serverError(error)
  }
}
