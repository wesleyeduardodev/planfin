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
          expenses: { include: { category: true }, orderBy: [{ period: "asc" }, { dueDate: "asc" }] },
          incomes: { orderBy: [{ period: "asc" }, { description: "asc" }] },
        },
      })
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
