import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

// Copia Valor/Esperado para a coluna Médio (sobrescreve médios existentes).
// Body opcional: { period?: number, target?: "expenses" | "incomes" }
// Sem body: aplica em todas as despesas e receitas de todos os períodos.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params

  try {
    const data = await request.json().catch(() => ({}))
    const period = typeof data.period === "number" ? data.period : null
    const target =
      data.target === "expenses" || data.target === "incomes" ? data.target : null

    const plan = await prisma.monthlyPlan.findFirst({
      where: { id, userId: user.id },
    })
    if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })

    if (target === null || target === "expenses") {
      if (period != null) {
        await prisma.$executeRaw`UPDATE plan_expenses SET average_amount = planned_amount WHERE plan_id = ${id} AND period = ${period}`
      } else {
        await prisma.$executeRaw`UPDATE plan_expenses SET average_amount = planned_amount WHERE plan_id = ${id}`
      }
    }
    if (target === null || target === "incomes") {
      if (period != null) {
        await prisma.$executeRaw`UPDATE plan_incomes SET average_amount = expected_amount WHERE plan_id = ${id} AND period = ${period}`
      } else {
        await prisma.$executeRaw`UPDATE plan_incomes SET average_amount = expected_amount WHERE plan_id = ${id}`
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}
