import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const year = searchParams.get("year")
  const month = searchParams.get("month")

  try {
    if (year && month) {
      const plan = await prisma.monthlyPlan.findUnique({
        where: {
          userId_year_month: {
            userId: user.id,
            year: parseInt(year),
            month: parseInt(month),
          },
        },
        include: {
          expenses: { include: { category: true } },
          incomes: { orderBy: [{ period: "asc" }, { description: "asc" }] },
        },
      })

      if (plan) {
        // Ordenar: período → data → categoria → descrição
        plan.expenses.sort((a, b) => {
          if (a.period !== b.period) return a.period - b.period
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0
          if (dateA !== dateB) return dateA - dateB
          const catA = a.category?.name ?? ""
          const catB = b.category?.name ?? ""
          if (catA !== catB) return catA.localeCompare(catB, "pt-BR")
          return a.description.localeCompare(b.description, "pt-BR")
        })
      }

      return NextResponse.json(plan)
    }

    const plans = await prisma.monthlyPlan.findMany({
      where: { userId: user.id },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    })
    return NextResponse.json(plans)
  } catch (error) {
    return serverError(error)
  }
}
