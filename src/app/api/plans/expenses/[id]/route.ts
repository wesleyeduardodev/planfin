import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"
import { toNoonUTC } from "@/lib/format"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params

  try {
    const data = await request.json()

    // Verify expense belongs to user's plan
    const expense = await prisma.planExpense.findFirst({
      where: { id },
      include: { plan: true },
    })
    if (!expense || expense.plan.userId !== user.id) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    }

    const updated = await prisma.planExpense.update({
      where: { id },
      data: {
        description: data.description,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? toNoonUTC(data.dueDate) : null) : undefined,
        plannedAmount: data.plannedAmount,
        paidAmount: data.paidAmount,
        isFixed: data.isFixed,
        categoryId: data.categoryId,
      },
      include: { category: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return serverError(error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params

  try {
    const expense = await prisma.planExpense.findFirst({
      where: { id },
      include: { plan: true },
    })
    if (!expense || expense.plan.userId !== user.id) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    }

    await prisma.planExpense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}
