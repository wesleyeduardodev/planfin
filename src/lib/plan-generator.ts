import { prisma } from "./prisma"

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
  const periodCount = settings?.periodCount ?? 2

  // Calculate initial balance from previous month
  let initialBalance = 0
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevPlan = await prisma.monthlyPlan.findUnique({
    where: { userId_year_month: { userId, year: prevYear, month: prevMonth } },
    include: { expenses: true, incomes: true },
  })

  if (prevPlan) {
    const prevPeriodCount = prevPlan.cutDays.length
    let balance = prevPlan.initialBalance
    for (let p = 1; p <= prevPeriodCount; p++) {
      const income = prevPlan.incomes
        .filter((i) => i.period === p)
        .reduce((s, i) => s + i.expectedAmount, 0)
      const expenses = prevPlan.expenses
        .filter((e) => e.period === p)
        .reduce((s, e) => s + e.plannedAmount, 0)
      balance = balance + income - expenses
    }
    initialBalance = balance
  }

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

  // Create expenses from recurring expenses
  const recurringExpenses = await prisma.recurringExpense.findMany({
    where: { userId, isActive: true },
  })

  const daysInMonth = new Date(year, month, 0).getDate()

  for (const re of recurringExpenses) {
    // Garantir que o período não excede o periodCount atual
    const period = Math.min(re.period, periodCount)
    const dueDay = re.dueDay
      ? Math.min(re.dueDay, daysInMonth)
      : undefined

    await prisma.planExpense.create({
      data: {
        planId: plan.id,
        period,
        description: re.description,
        dueDate: dueDay
          ? new Date(Date.UTC(year, month - 1, dueDay, 12, 0, 0))
          : undefined,
        plannedAmount: re.amount,
        paidAmount: 0,
        categoryId: re.categoryId,
        recurringExpenseId: re.id,
      },
    })
  }

  // Create incomes from income sources (salaries)
  const incomeSources = await prisma.incomeSource.findMany({
    where: { userId, isActive: true },
  })

  for (const is of incomeSources) {
    const period = Math.min(is.period, periodCount)
    await prisma.planIncome.create({
      data: {
        planId: plan.id,
        period,
        description: is.description,
        expectedAmount: is.amount,
        receivedAmount: 0,
        incomeSourceId: is.id,
      },
    })
  }

  // Create incomes from active receivables with pending installments
  const receivables = await prisma.receivable.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  for (const r of receivables) {
    if (r.paidInstall < r.totalInstall) {
      const currentInstall = r.paidInstall + 1
      const period = Math.min(r.period, periodCount)
      await prisma.planIncome.create({
        data: {
          planId: plan.id,
          period,
          description: `${r.debtor} (${currentInstall}/${r.totalInstall})`,
          expectedAmount: r.installment,
          receivedAmount: 0,
          receivableId: r.id,
        },
      })
    }
  }

  // Return the full plan with expenses and incomes
  const fullPlan = await prisma.monthlyPlan.findUnique({
    where: { id: plan.id },
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
