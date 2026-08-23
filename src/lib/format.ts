export const TIMEZONE = "America/Fortaleza"

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIMEZONE,
  }).format(d)
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: TIMEZONE,
  }).format(d)
}

export function getMonthName(month: number): string {
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]
  return names[month - 1] || ""
}

/** Retorna ano, mes e dia atuais no fuso de Fortaleza */
export function nowBR(): { year: number; month: number; day: number } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now)
  const year = parseInt(parts.find((p) => p.type === "year")!.value)
  const month = parseInt(parts.find((p) => p.type === "month")!.value)
  const day = parseInt(parts.find((p) => p.type === "day")!.value)
  return { year, month, day }
}

/**
 * Data padrão (yyyy-MM-dd) para novos lançamentos de um plano:
 * hoje (fuso de Fortaleza) se o plano for do mês atual; senão o mesmo dia
 * dentro do mês do plano (limitado ao último dia).
 */
export function defaultDueDate(year: number, month: number): string {
  const t = nowBR()
  const lastDay = new Date(year, month, 0).getDate()
  const day = t.year === year && t.month === month ? t.day : Math.min(t.day, lastDay)
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Cria Date em meio-dia UTC a partir de yyyy-MM-dd para evitar shift de timezone */
export function toNoonUTC(dateStr: string): Date {
  // Se já contém horário (ex: "2026-03-06T12:00:00Z"), usa direto
  if (dateStr.includes("T")) return new Date(dateStr)
  return new Date(`${dateStr}T12:00:00Z`)
}

export function parseCurrencyInput(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".")
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}
