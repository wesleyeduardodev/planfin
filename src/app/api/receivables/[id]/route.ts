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
    const receivable = await prisma.receivable.update({
      where: { id, userId: user.id },
      data: {
        debtor: data.debtor,
        installment: data.installment,
        totalInstall: data.totalInstall,
        paidInstall: data.paidInstall,
        period: data.period,
        isActive: data.isActive,
      },
    })
    return NextResponse.json(receivable)
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
    await prisma.receivable.delete({ where: { id, userId: user.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}
