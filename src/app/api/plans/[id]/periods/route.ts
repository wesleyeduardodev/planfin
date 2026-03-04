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
    const { period, newCutDay, daysInMonth } = await request.json()

    const plan = await prisma.monthlyPlan.findFirst({
      where: { id, userId: user.id },
    })
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    const maxDay = daysInMonth || 31

    if (!Number.isInteger(period) || period < 1 || period > plan.cutDays.length) {
      return NextResponse.json({ error: "Período inválido" }, { status: 400 })
    }

    if (!Number.isInteger(newCutDay) || newCutDay < 1 || newCutDay > maxDay) {
      return NextResponse.json(
        { error: `Dia deve ser entre 1 e ${maxDay}` },
        { status: 400 }
      )
    }

    // Verificar que não sobrepõe outro período (mesmo dia)
    const otherCutDays = plan.cutDays.filter((_, i) => i !== period - 1)
    if (otherCutDays.includes(newCutDay)) {
      return NextResponse.json(
        { error: "Já existe um período iniciando neste dia" },
        { status: 400 }
      )
    }

    // Montar novo array mantendo a ordem
    const newCutDays = [...otherCutDays, newCutDay].sort((a, b) => a - b)

    // Verificar que a posição do período não mudou (itens ficariam no período errado)
    const newIndex = newCutDays.indexOf(newCutDay)
    if (newIndex !== period - 1) {
      return NextResponse.json(
        { error: "O novo dia faria o período trocar de posição com outro. Ajuste para manter a ordem." },
        { status: 400 }
      )
    }

    await prisma.monthlyPlan.update({
      where: { id },
      data: { cutDays: newCutDays },
    })

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params

  try {
    const { cutDay } = await request.json()

    const plan = await prisma.monthlyPlan.findFirst({
      where: { id, userId: user.id },
    })
    if (!plan) {
      return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    }

    if (!Number.isInteger(cutDay) || cutDay < 1 || cutDay > 31) {
      return NextResponse.json(
        { error: "Dia de início deve ser entre 1 e 31" },
        { status: 400 }
      )
    }

    if (plan.cutDays.includes(cutDay)) {
      return NextResponse.json(
        { error: "Já existe um período iniciando neste dia" },
        { status: 400 }
      )
    }

    // Inserir o novo cutDay e ordenar
    const newCutDays = [...plan.cutDays, cutDay].sort((a, b) => a - b)
    // Descobrir qual período ficou o novo dia (1-based)
    const newPeriodIndex = newCutDays.indexOf(cutDay)
    const newPeriod = newPeriodIndex + 1

    await prisma.$transaction(async (tx) => {
      // Renumerar períodos existentes que estão >= newPeriod (do maior para o menor para não colidir)
      for (let p = plan.cutDays.length; p >= newPeriod; p--) {
        await tx.planExpense.updateMany({
          where: { planId: id, period: p },
          data: { period: p + 1 },
        })
        await tx.planIncome.updateMany({
          where: { planId: id, period: p },
          data: { period: p + 1 },
        })
      }

      // Atualizar cutDays do plano
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
