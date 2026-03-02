import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const receivables = await prisma.receivable.findMany({
      where: { userId: user.id },
      orderBy: [{ isActive: "desc" }, { debtor: "asc" }],
    })
    return NextResponse.json(receivables)
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()
    const receivable = await prisma.receivable.create({
      data: {
        userId: user.id,
        debtor: data.debtor,
        installment: data.installment,
        totalInstall: data.totalInstall,
        paidInstall: data.paidInstall ?? 0,
        period: data.period,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(receivable)
  } catch (error) {
    return serverError(error)
  }
}
