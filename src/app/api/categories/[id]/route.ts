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
    const category = await prisma.category.update({
      where: { id, userId: user.id },
      data: { name: data.name, color: data.color, order: data.order },
    })
    return NextResponse.json(category)
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
    const usageCount = await prisma.planExpense.count({ where: { categoryId: id } })
    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Não é possível excluir: ${usageCount} despesa(s) vinculada(s). Reatribua as despesas antes de excluir.` },
        { status: 400 }
      )
    }

    await prisma.category.delete({ where: { id, userId: user.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}
