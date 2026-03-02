import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params

  try {
    const data = await request.json()
    const expense = await prisma.recurringExpense.update({
      where: { id, userId: user.id },
      data: {
        categoryId: data.categoryId,
        description: data.description,
        amount: data.amount,
        period: data.period,
        dueDay: data.dueDay,
        isVariable: data.isVariable,
        isActive: data.isActive,
      },
      include: { category: true },
    })
    return NextResponse.json(expense)
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
    await prisma.recurringExpense.delete({ where: { id, userId: user.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}
