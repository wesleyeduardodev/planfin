import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"
import { toNoonUTC } from "@/lib/format"

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()

    const plan = await prisma.monthlyPlan.findFirst({
      where: { id: data.planId, userId: user.id },
    })
    if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })

    const income = await prisma.planIncome.create({
      data: {
        planId: data.planId,
        period: data.period,
        description: data.description,
        expectedAmount: data.expectedAmount,
        receivedAmount: data.receivedAmount ?? 0,
        dueDate: data.dueDate ? toNoonUTC(data.dueDate) : undefined,
        isFixed: data.isFixed ?? true,
      },
    })
    return NextResponse.json(income)
  } catch (error) {
    return serverError(error)
  }
}
