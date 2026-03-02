import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const plans = await prisma.monthlyPlan.findMany({
      where: { userId: user.id },
      include: {
        expenses: { include: { category: true } },
        incomes: true,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    })

    // Monthly summary
    const monthlySummary = plans.map((plan) => {
      const totalIncome = plan.incomes.reduce(
        (s, i) => s + i.expectedAmount,
        0
      )
      const totalExpenses = plan.expenses.reduce(
        (s, e) => s + e.plannedAmount,
        0
      )
      const totalPaid = plan.expenses.reduce((s, e) => s + e.paidAmount, 0)

      const p1Expenses = plan.expenses
        .filter((e) => e.period === 1)
        .reduce((s, e) => s + e.plannedAmount, 0)
      const p2Expenses = plan.expenses
        .filter((e) => e.period === 2)
        .reduce((s, e) => s + e.plannedAmount, 0)

      return {
        year: plan.year,
        month: plan.month,
        totalIncome,
        totalExpenses,
        totalPaid,
        balance: plan.initialBalance + totalIncome - totalExpenses,
        initialBalance: plan.initialBalance,
        p1Expenses,
        p2Expenses,
      }
    })

    // Category breakdown across all months
    const categoryData: Record<
      string,
      Record<string, { total: number; color: string }>
    > = {}

    for (const plan of plans) {
      const key = `${plan.year}-${String(plan.month).padStart(2, "0")}`
      categoryData[key] = {}

      for (const exp of plan.expenses) {
        const catName = exp.category?.name || "Sem Categoria"
        const catColor = exp.category?.color || "#6b7280"
        if (!categoryData[key][catName]) {
          categoryData[key][catName] = { total: 0, color: catColor }
        }
        categoryData[key][catName].total += exp.plannedAmount
      }
    }

    // Get unique categories
    const allCategories = new Set<string>()
    Object.values(categoryData).forEach((monthData) => {
      Object.keys(monthData).forEach((cat) => allCategories.add(cat))
    })

    return NextResponse.json({
      monthlySummary,
      categoryData,
      categories: Array.from(allCategories),
    })
  } catch (error) {
    return serverError(error)
  }
}
