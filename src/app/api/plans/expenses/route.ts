import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"
import { toNoonUTC } from "@/lib/format"

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()

    // Verify plan belongs to user
    const plan = await prisma.monthlyPlan.findFirst({
      where: { id: data.planId, userId: user.id },
    })
    if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })

    const expense = await prisma.planExpense.create({
      data: {
        planId: data.planId,
        period: data.period,
        description: data.description,
        dueDate: data.dueDate ? toNoonUTC(data.dueDate) : undefined,
        plannedAmount: data.plannedAmount,
        paidAmount: data.paidAmount ?? 0,
        categoryId: data.categoryId,
      },
      include: { category: true },
    })
    return NextResponse.json(expense)
  } catch (error) {
    return serverError(error)
  }
}
