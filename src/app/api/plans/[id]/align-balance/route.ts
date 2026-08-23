import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"
import { calcPeriodSummary } from "@/lib/calculations"
import { toNoonUTC, formatCurrency } from "@/lib/format"

// Alinhamento de saldo em conta.
// Body: { date: "yyyy-MM-dd", balance: number, dryRun?: boolean }
// - Descobre o período pela data (cutDays do plano)
// - diferença = saldo informado - saldo REAL encadeado do período
// - dryRun: devolve só o preview; senão cria receita (diff > 0) ou despesa (diff < 0)
//   já recebida/paga, marcada como isAdjustment.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  const { id } = await params

  try {
    const data = await request.json()
    const balance = Number(data.balance)
    const dateStr: string = data.date
    const dryRun = data.dryRun === true

    if (!Number.isFinite(balance)) {
      return NextResponse.json({ error: "Saldo inválido" }, { status: 400 })
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr ?? "")
    if (!m) return NextResponse.json({ error: "Data inválida" }, { status: 400 })
    const [, y, mo, d] = m
    const year = Number(y), month = Number(mo), day = Number(d)

    const plan = await prisma.monthlyPlan.findFirst({
      where: { id, userId: user.id },
      include: { expenses: true, incomes: true },
    })
    if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
    if (year !== plan.year || month !== plan.month) {
      return NextResponse.json({ error: "A data precisa estar dentro do mês deste plano" }, { status: 400 })
    }

    // Período que contém a data
    let period = 1
    for (let i = 0; i < plan.cutDays.length; i++) {
      if (day >= plan.cutDays[i]) period = i + 1
    }

    // Saldo real encadeado até o período encontrado
    let entry = plan.initialBalance
    let realEntry = plan.initialBalance
    let realBalance = plan.initialBalance
    for (let p = 1; p <= period; p++) {
      const s = calcPeriodSummary(
        entry,
        plan.expenses.filter((e) => e.period === p),
        plan.incomes.filter((i) => i.period === p),
        realEntry
      )
      entry = s.balance
      realEntry = s.realBalance
      realBalance = s.realBalance
    }

    const diff = Math.round((balance - realBalance) * 100) / 100
    const kind: "income" | "expense" | "none" = diff > 0 ? "income" : diff < 0 ? "expense" : "none"
    const amount = Math.abs(diff)
    const description = `Ajuste de saldo (${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")} → ${formatCurrency(balance)})`

    const preview = { period, currentRealBalance: realBalance, informedBalance: balance, diff, kind, amount, description }
    if (dryRun || kind === "none") return NextResponse.json(preview)

    const dueDate = toNoonUTC(dateStr)
    if (kind === "income") {
      await prisma.planIncome.create({
        data: {
          planId: plan.id,
          period,
          description,
          expectedAmount: amount,
          receivedAmount: amount,
          dueDate,
          isFixed: false,
          isAdjustment: true,
        },
      })
    } else {
      await prisma.planExpense.create({
        data: {
          planId: plan.id,
          period,
          description,
          plannedAmount: amount,
          paidAmount: amount,
          dueDate,
          isFixed: false,
          paymentMethod: "CASH",
          isAdjustment: true,
        },
      })
    }
    return NextResponse.json({ ...preview, created: true })
  } catch (error) {
    return serverError(error)
  }
}
