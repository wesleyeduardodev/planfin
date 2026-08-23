import { prisma } from "@/lib/prisma"
import { sendToUser, type PushPayload } from "@/lib/push"
import { formatCurrency, toNoonUTC, TIMEZONE } from "@/lib/format"

type Kind = "eve" | "day"

/** Data e hora atuais em Fortaleza */
function nowInTz(): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24 }
}

function addDays(d: { year: number; month: number; day: number }, n: number) {
  const dt = new Date(Date.UTC(d.year, d.month - 1, d.day + n))
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() }
}

function ymd(d: { year: number; month: number; day: number }) {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`
}

interface Item {
  description: string
  amount: number
  period: number
}

function buildPayload(kind: Kind, type: "expense" | "income", items: Item[], target: { year: number; month: number; day: number }): PushPayload {
  const when = kind === "eve" ? "Amanhã" : "Hoje"
  const total = items.reduce((s, i) => s + i.amount, 0)
  const url = `/planejamento/${target.year}/${target.month}`
  const tag = `${kind}-${type}-${ymd(target)}`
  const noun = type === "expense" ? "despesa" : "receita"

  if (items.length === 1) {
    const it = items[0]
    return {
      title: `${when}: ${it.description} — ${formatCurrency(it.amount)}`,
      body: `${type === "expense" ? "Despesa" : "Receita"} · Período ${it.period}`,
      url,
      tag,
    }
  }
  const list = items
    .slice(0, 4)
    .map((i) => `${i.description} ${formatCurrency(i.amount)}`)
    .join(" · ")
  const more = items.length > 4 ? ` · +${items.length - 4}` : ""
  return {
    title: `${when}: ${items.length} ${noun}s — ${formatCurrency(total)}`,
    body: list + more,
    url,
    tag,
  }
}

export interface RunResult {
  hour: number
  users: number
  sent: number
  skipped: number
  removed: number
}

/**
 * Executa um ciclo: para cada usuário com lembretes ativos, verifica se a hora
 * atual (Fortaleza) bate com a hora da véspera ou do dia e envia os pendentes.
 * Idempotente por (usuário, tipo, data) via NotificationLog.
 */
export async function runReminders(forceKind?: Kind): Promise<RunResult> {
  const now = nowInTz()
  const result: RunResult = { hour: now.hour, users: 0, sent: 0, skipped: 0, removed: 0 }

  const settingsList = await prisma.settings.findMany({
    where: { remindersEnabled: true, user: { pushSubscriptions: { some: {} } } },
  })

  for (const st of settingsList) {
    const kinds: Kind[] = []
    if (forceKind) kinds.push(forceKind)
    else {
      if (now.hour === st.reminderEveHour) kinds.push("eve")
      if (now.hour === st.reminderDayHour) kinds.push("day")
    }
    if (kinds.length === 0) continue
    result.users++

    for (const kind of kinds) {
      const target = kind === "eve" ? addDays(now, 1) : now
      const targetDate = toNoonUTC(ymd(target))

      // já enviado?
      const already = await prisma.notificationLog.findUnique({
        where: { userId_kind_targetDate: { userId: st.userId, kind, targetDate } },
      })
      if (already && !forceKind) { result.skipped++; continue }

      const plan = await prisma.monthlyPlan.findUnique({
        where: { userId_year_month: { userId: st.userId, year: target.year, month: target.month } },
        include: { expenses: true, incomes: true },
      })

      const sameDay = (d: Date | null) => d != null && d.getTime() === targetDate.getTime()

      const expenses: Item[] = st.remindExpenses && plan
        ? plan.expenses
            .filter((e) => sameDay(e.dueDate) && e.paidAmount < e.plannedAmount && !e.isAdjustment)
            .map((e) => ({ description: e.description, amount: e.plannedAmount - e.paidAmount, period: e.period }))
        : []
      const incomes: Item[] = st.remindIncomes && plan
        ? plan.incomes
            .filter((i) => sameDay(i.dueDate) && i.receivedAmount < i.expectedAmount && !i.isAdjustment)
            .map((i) => ({ description: i.description, amount: i.expectedAmount - i.receivedAmount, period: i.period }))
        : []

      if (expenses.length > 0) {
        const r = await sendToUser(st.userId, buildPayload(kind, "expense", expenses, target))
        result.sent += r.sent; result.removed += r.removed
      }
      if (incomes.length > 0) {
        const r = await sendToUser(st.userId, buildPayload(kind, "income", incomes, target))
        result.sent += r.sent; result.removed += r.removed
      }

      if (!already) {
        await prisma.notificationLog.create({ data: { userId: st.userId, kind, targetDate } }).catch(() => {})
      }
    }
  }
  return result
}
