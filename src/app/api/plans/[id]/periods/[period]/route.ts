import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; period: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id, period: periodStr } = await params
  const period = parseInt(periodStr)

  try {
    const plan = await prisma.monthlyPlan.findFirst({
      where: { id, userId: user.id },
    })
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    const periodCount = plan.cutDays.length
    if (period <= 1 || period > periodCount) {
      return NextResponse.json(
        { error: "Período inválido para exclusão" },
        { status: 400 }
      )
    }
    if (periodCount <= 1) {
      return NextResponse.json(
        { error: "Não é possível excluir o único período" },
        { status: 400 }
      )
    }

    // Novo cutDays sem o período excluído
    const newCutDays = plan.cutDays.filter((_, i) => i !== period - 1)

    await prisma.$transaction(async (tx) => {
      // 1. Mover itens do período excluído para o anterior
      await tx.planExpense.updateMany({
        where: { planId: id, period },
        data: { period: period - 1 },
      })
      await tx.planIncome.updateMany({
        where: { planId: id, period },
        data: { period: period - 1 },
      })

      // 2. Renumerar períodos posteriores (period - 1)
      // Prisma não suporta decrement em updateMany, então fazemos em loop descendente
      for (let p = period + 1; p <= periodCount; p++) {
        await tx.planExpense.updateMany({
          where: { planId: id, period: p },
          data: { period: p - 1 },
        })
        await tx.planIncome.updateMany({
          where: { planId: id, period: p },
          data: { period: p - 1 },
        })
      }

      // 3. Atualizar cutDays do plano
      await tx.monthlyPlan.update({
        where: { id },
        data: { cutDays: newCutDays },
      })
    })

    // Retornar plano atualizado
    const updated = await prisma.monthlyPlan.findUnique({
      where: { id },
      include: {
        expenses: { include: { category: true } },
        incomes: { orderBy: [{ period: "asc" }, { description: "asc" }] },
      },
    })

    if (updated) {
      updated.expenses.sort((a, b) => {
        if (a.period !== b.period) return a.period - b.period
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0
        if (dateA !== dateB) return dateA - dateB
        const catA = a.category?.name ?? ""
        const catB = b.category?.name ?? ""
        if (catA !== catB) return catA.localeCompare(catB, "pt-BR")
        return a.description.localeCompare(b.description, "pt-BR")
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    return serverError(error)
  }
}
