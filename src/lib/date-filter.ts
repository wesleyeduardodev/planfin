import { nowBR } from "./format"

/** Filtro por intervalo de datas (yyyy-MM-dd). Campos vazios = sem limite. */
export interface DateRange {
  from: string
  to: string
}

export const EMPTY_RANGE: DateRange = { from: "", to: "" }

export function isRangeActive(r: DateRange | undefined | null): boolean {
  return !!r && (r.from !== "" || r.to !== "")
}

/** Normaliza dueDate (ISO/Date) para yyyy-MM-dd em UTC (as datas são gravadas ao meio-dia UTC). */
export function toYmd(d: string | Date | null | undefined): string | null {
  if (!d) return null
  const dt = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString().slice(0, 10)
}

/**
 * Decide se um item passa no filtro.
 * - Nenhum filtro ativo → passa.
 * - Filtro ativo e item sem data → não passa.
 */
export function matchesRange(dueDate: string | Date | null | undefined, ranges: Array<DateRange | undefined | null>): boolean {
  const active = ranges.filter(isRangeActive) as DateRange[]
  if (active.length === 0) return true
  const ymd = toYmd(dueDate)
  if (!ymd) return false
  return active.every((r) => (r.from === "" || ymd >= r.from) && (r.to === "" || ymd <= r.to))
}

export function rangeLabel(r: DateRange): string {
  const fmt = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`
  if (r.from && r.to) return r.from === r.to ? fmt(r.from) : `${fmt(r.from)} – ${fmt(r.to)}`
  if (r.from) return `a partir de ${fmt(r.from)}`
  if (r.to) return `até ${fmt(r.to)}`
  return ""
}

function ymdOf(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toISOString().slice(0, 10)
}

/** Atalhos relativos a hoje (Fortaleza). */
export function presetRange(kind: "today" | "week" | "next7"): DateRange {
  const t = nowBR()
  if (kind === "today") {
    const s = ymdOf(t.year, t.month, t.day)
    return { from: s, to: s }
  }
  if (kind === "next7") {
    return { from: ymdOf(t.year, t.month, t.day), to: ymdOf(t.year, t.month, t.day + 7) }
  }
  // semana atual: segunda a domingo
  const dow = new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay() // 0=dom
  const offsetToMonday = dow === 0 ? -6 : 1 - dow
  return { from: ymdOf(t.year, t.month, t.day + offsetToMonday), to: ymdOf(t.year, t.month, t.day + offsetToMonday + 6) }
}
