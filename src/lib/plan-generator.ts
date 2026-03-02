import { prisma } from "./prisma"

function getPreviousMonth(year: number, month: number) {
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  return { prevYear, prevMonth }
}

async function calcInitialBalance(userId: string, year: number, month: number) {
  const { prevYear, prevMonth } = getPreviousMonth(year, month)
  const prevPlan = await prisma.monthlyPlan.findUnique({
    where: { userId_year_month: { userId, year: prevYear, month: prevMonth } },
    include: { expenses: true, incomes: true },
  })

  if (!prevPlan) return 0

  const prevPeriodCount = prevPlan.cutDays.length
  let balance = prevPlan.initialBalance
  for (let p = 1; p <= prevPeriodCount; p++) {
    const received = prevPlan.incomes
      .filter((i) => i.period === p)
      .reduce((s, i) => s + i.receivedAmount, 0)
    const paid = prevPlan.expenses
      .filter((e) => e.period === p)
      .reduce((s, e) => s + e.paidAmount, 0)
    balance = balance + received - paid
  }
  return balance
}

function adjustDate(originalDate: Date, newYear: number, newMonth: number): Date {
  const origDay = originalDate.getUTCDate()
  const daysInNewMonth = new Date(newYear, newMonth, 0).getDate()
  const day = Math.min(origDay, daysInNewMonth)
  return new Date(Date.UTC(newYear, newMonth - 1, day, 12, 0, 0))
}

async function fetchFullPlan(planId: string) {
  const fullPlan = await prisma.monthlyPlan.findUnique({
    where: { id: planId },
    include: {
      expenses: { include: { category: true } },
      incomes: { orderBy: [{ period: "asc" }, { description: "asc" }] },
    },
  })

  if (fullPlan) {
    fullPlan.expenses.sort((a, b) => {
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

  return fullPlan
}

export async function generateMonthlyPlan(
  userId: string,
  year: number,
  month: number
) {
  // Check if plan already exists
  const existing = await prisma.monthlyPlan.findUnique({
    where: { userId_year_month: { userId, year, month } },
  })
  if (existing) {
    throw new Error("Plano para este mês já existe")
  }

  // Get user settings
  const settings = await prisma.settings.findUnique({ where: { userId } })
  const periodDays = settings?.periodDays ?? [1, 20]

  const initialBalance = await calcInitialBalance(userId, year, month)

  // Create the plan
  const plan = await prisma.monthlyPlan.create({
    data: {
      userId,
      year,
      month,
      cutDays: periodDays,
      initialBalance,
    },
  })

  return fetchFullPlan(plan.id)
}

export async function copyMonthlyPlan(
  userId: string,
  year: number,
  month: number,
  onlyFixed: boolean
) {
  // Check if plan already exists
  const existing = await prisma.monthlyPlan.findUnique({
    where: { userId_year_month: { userId, year, month } },
  })
  if (existing) {
    throw new Error("Plano para este mês já existe")
  }

  // Find previous month's plan
  const { prevYear, prevMonth } = getPreviousMonth(year, month)
  const prevPlan = await prisma.monthlyPlan.findUnique({
    where: { userId_year_month: { userId, year: prevYear, month: prevMonth } },
    include: { expenses: { include: { category: true } }, incomes: true },
  })

  if (!prevPlan) {
    throw new Error("Nenhum plano anterior para copiar")
  }

  const initialBalance = await calcInitialBalance(userId, year, month)

  // Create new plan with same cutDays as previous
  const plan = await prisma.monthlyPlan.create({
    data: {
      userId,
      year,
      month,
      cutDays: prevPlan.cutDays,
      initialBalance,
    },
  })

  // Filter expenses
  const expensesToCopy = onlyFixed
    ? prevPlan.expenses.filter((e) => e.isFixed)
    : prevPlan.expenses

  for (const e of expensesToCopy) {
    await prisma.planExpense.create({
      data: {
        planId: plan.id,
        period: e.period,
        description: e.description,
        dueDate: e.dueDate ? adjustDate(e.dueDate, year, month) : undefined,
        plannedAmount: e.plannedAmount,
        paidAmount: 0,
        isFixed: e.isFixed,
        categoryId: e.categoryId,
      },
    })
  }

  // Filter incomes
  const incomesToCopy = onlyFixed
    ? prevPlan.incomes.filter((i) => i.isFixed)
    : prevPlan.incomes

  for (const i of incomesToCopy) {
    await prisma.planIncome.create({
      data: {
        planId: plan.id,
        period: i.period,
        description: i.description,
        expectedAmount: i.expectedAmount,
        receivedAmount: 0,
        dueDate: i.dueDate ? adjustDate(i.dueDate, year, month) : undefined,
        isFixed: i.isFixed,
      },
    })
  }

  return fetchFullPlan(plan.id)
}
