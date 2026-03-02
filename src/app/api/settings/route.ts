import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    let settings = await prisma.settings.findUnique({
      where: { userId: user.id },
    })
    if (!settings) {
      settings = await prisma.settings.create({
        data: { userId: user.id },
      })
    }
    return NextResponse.json(settings)
  } catch (error) {
    return serverError(error)
  }
}

export async function PUT(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()

    const periodCount = data.periodCount as number
    const periodDays = data.periodDays as number[]

    // Validações
    if (!periodCount || periodCount < 1 || periodCount > 31) {
      return NextResponse.json(
        { error: "Quantidade de períodos deve ser entre 1 e 31" },
        { status: 400 }
      )
    }

    if (!Array.isArray(periodDays) || periodDays.length !== periodCount) {
      return NextResponse.json(
        { error: "Quantidade de dias deve corresponder ao número de períodos" },
        { status: 400 }
      )
    }

    for (const day of periodDays) {
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        return NextResponse.json(
          { error: "Cada dia de início deve ser entre 1 e 31" },
          { status: 400 }
        )
      }
    }

    const sorted = [...periodDays].sort((a, b) => a - b)
    const hasDuplicates = new Set(sorted).size !== sorted.length
    if (hasDuplicates) {
      return NextResponse.json(
        { error: "Dias de início não podem ser duplicados" },
        { status: 400 }
      )
    }

    // Buscar periodCount anterior para reclassificar se necessário
    const oldSettings = await prisma.settings.findUnique({
      where: { userId: user.id },
    })
    const oldPeriodCount = oldSettings?.periodCount ?? 2

    const settings = await prisma.settings.upsert({
      where: { userId: user.id },
      update: {
        periodCount,
        periodDays: sorted,
      },
      create: {
        userId: user.id,
        periodCount,
        periodDays: sorted,
      },
    })

    // Ao reduzir períodos, reclassificar itens órfãos
    if (periodCount < oldPeriodCount) {
      await prisma.recurringExpense.updateMany({
        where: { userId: user.id, period: { gt: periodCount } },
        data: { period: periodCount },
      })
      await prisma.incomeSource.updateMany({
        where: { userId: user.id, period: { gt: periodCount } },
        data: { period: periodCount },
      })
      await prisma.receivable.updateMany({
        where: { userId: user.id, period: { gt: periodCount } },
        data: { period: periodCount },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    return serverError(error)
  }
}
