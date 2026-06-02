import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, badRequest, serverError } from "@/lib/api-utils"
import { calcInitialBalance } from "@/lib/plan-generator"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params

  try {
    const plan = await prisma.monthlyPlan.findFirst({
      where: { id, userId: user.id },
    })
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    const body = await request.json()
    let initialBalance: number

    if (body.recalc === true) {
      // Recalcula o saldo a partir do mês anterior (estado atual)
      initialBalance = await calcInitialBalance(user.id, plan.year, plan.month)
    } else {
      if (typeof body.initialBalance !== "number" || !Number.isFinite(body.initialBalance)) {
        return badRequest("Saldo inicial inválido")
      }
      initialBalance = body.initialBalance
    }

    const updated = await prisma.monthlyPlan.update({
      where: { id },
      data: { initialBalance },
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
    const plan = await prisma.monthlyPlan.findFirst({
      where: { id, userId: user.id },
    })
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    // Cascade delete removes all expenses and incomes automatically
    await prisma.monthlyPlan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}
