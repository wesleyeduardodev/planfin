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
  const cutDay1 = settings?.salaryDay1 ?? 1
  const cutDay2 = settings?.salaryDay2 ?? 20

  // Calculate initial balance from previous month
  let initialBalance = 0
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevPlan = await prisma.monthlyPlan.findUnique({
    where: { userId_year_month: { userId, year: prevYear, month: prevMonth } },
    include: { expenses: true, incomes: true },
  })

  if (prevPlan) {
    const totalIncomeP1 = prevPlan.incomes
      .filter((i) => i.period === 1)
      .reduce((s, i) => s + i.expectedAmount, 0)
    const totalExpensesP1 = prevPlan.expenses
      .filter((e) => e.period === 1)
      .reduce((s, e) => s + e.plannedAmount, 0)
    const balanceP1 = prevPlan.initialBalance + totalIncomeP1 - totalExpensesP1

    const totalIncomeP2 = prevPlan.incomes
      .filter((i) => i.period === 2)
      .reduce((s, i) => s + i.expectedAmount, 0)
    const totalExpensesP2 = prevPlan.expenses
      .filter((e) => e.period === 2)
      .reduce((s, e) => s + e.plannedAmount, 0)
    initialBalance = balanceP1 + totalIncomeP2 - totalExpensesP2
  }

  // Create the plan
  const plan = await prisma.monthlyPlan.create({
    data: {
      userId,
      year,
      month,
      cutDay1,
      cutDay2,
      initialBalance,
    },
  })

  // Create expenses from recurring expenses
  const recurringExpenses = await prisma.recurringExpense.findMany({
    where: { userId, isActive: true },
  })

  const daysInMonth = new Date(year, month, 0).getDate()

  for (const re of recurringExpenses) {
    const dueDay = re.dueDay
      ? Math.min(re.dueDay, daysInMonth)
      : undefined

    await prisma.planExpense.create({
      data: {
        planId: plan.id,
        period: re.period,
        description: re.description,
        dueDate: dueDay
          ? new Date(year, month - 1, dueDay)
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
    await prisma.planIncome.create({
      data: {
        planId: plan.id,
        period: is.period,
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
      await prisma.planIncome.create({
        data: {
          planId: plan.id,
          period: r.period,
          description: `${r.debtor} (${currentInstall}/${r.totalInstall})`,
          expectedAmount: r.installment,
          receivedAmount: 0,
          receivableId: r.id,
        },
      })
    }
  }

  // Return the full plan with expenses and incomes
  return prisma.monthlyPlan.findUnique({
    where: { id: plan.id },
    include: {
      expenses: { include: { category: true }, orderBy: [{ period: "asc" }, { dueDate: "asc" }] },
      incomes: { orderBy: [{ period: "asc" }, { description: "asc" }] },
    },
  })
}
