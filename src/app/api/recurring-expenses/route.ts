import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const expenses = await prisma.recurringExpense.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: [{ period: "asc" }, { description: "asc" }],
    })
    return NextResponse.json(expenses)
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()
    const expense = await prisma.recurringExpense.create({
      data: {
        userId: user.id,
        categoryId: data.categoryId,
        description: data.description,
        amount: data.amount,
        period: data.period,
        dueDay: data.dueDay,
        isVariable: data.isVariable ?? false,
        isActive: data.isActive ?? true,
      },
      include: { category: true },
    })
    return NextResponse.json(expense)
  } catch (error) {
    return serverError(error)
  }
}
