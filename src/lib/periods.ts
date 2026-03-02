export function getPeriodDateRange(
  cutDays: number[],
  period: number,
  daysInMonth: number
): { start: number; end: number } {
  const start = cutDays[period - 1]
  const end = period < cutDays.length ? cutDays[period] - 1 : daysInMonth
  return { start, end }
}

export function getPeriodLabel(
  cutDays: number[],
  period: number,
  daysInMonth: number
): string {
  const { start, end } = getPeriodDateRange(cutDays, period, daysInMonth)
  return `Período ${period} (${String(start).padStart(2, "0")} a ${String(end).padStart(2, "0")})`
}
