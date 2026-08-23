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

    if (periodDays[0] !== 1) {
      return NextResponse.json(
        { error: "O primeiro período deve começar no dia 1" },
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

    return NextResponse.json(settings)
  } catch (error) {
    return serverError(error)
  }
}

// Atualiza só as preferências de lembrete (não mexe em períodos)
export async function PATCH(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()
    const update: {
      reminderEveHour?: number
      reminderDayHour?: number
      remindExpenses?: boolean
      remindIncomes?: boolean
      remindersEnabled?: boolean
      themePreference?: string
      swipeActions?: boolean
      showFab?: boolean
    } = {}

    const hour = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 23 ? (v as number) : undefined
    if (data.reminderEveHour !== undefined) {
      const h = hour(data.reminderEveHour)
      if (h === undefined) return NextResponse.json({ error: "Hora inválida" }, { status: 400 })
      update.reminderEveHour = h
    }
    if (data.reminderDayHour !== undefined) {
      const h = hour(data.reminderDayHour)
      if (h === undefined) return NextResponse.json({ error: "Hora inválida" }, { status: 400 })
      update.reminderDayHour = h
    }
    if (typeof data.remindExpenses === "boolean") update.remindExpenses = data.remindExpenses
    if (typeof data.remindIncomes === "boolean") update.remindIncomes = data.remindIncomes
    if (typeof data.remindersEnabled === "boolean") update.remindersEnabled = data.remindersEnabled
    if (["light", "dark", "system"].includes(data.themePreference)) update.themePreference = data.themePreference
    if (typeof data.swipeActions === "boolean") update.swipeActions = data.swipeActions
    if (typeof data.showFab === "boolean") update.showFab = data.showFab

    const settings = await prisma.settings.upsert({
      where: { userId: user.id },
      update,
      create: { userId: user.id, ...update },
    })
    return NextResponse.json(settings)
  } catch (error) {
    return serverError(error)
  }
}
