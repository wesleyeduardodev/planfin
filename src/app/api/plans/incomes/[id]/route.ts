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

    const income = await prisma.planIncome.findFirst({
      where: { id },
      include: { plan: true },
    })
    if (!income || income.plan.userId !== user.id) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    }

    const updated = await prisma.planIncome.update({
      where: { id },
      data: {
        description: data.description,
        expectedAmount: data.expectedAmount,
        receivedAmount: data.receivedAmount,
        dueDate: data.dueDate !== undefined ? (data.dueDate ? toNoonUTC(data.dueDate) : null) : undefined,
        isFixed: data.isFixed,
      },
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
    const income = await prisma.planIncome.findFirst({
      where: { id },
      include: { plan: true },
    })
    if (!income || income.plan.userId !== user.id) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 })
    }

    await prisma.planIncome.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}
