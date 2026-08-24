"use client"

import { SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { type DateRange, EMPTY_RANGE, isRangeActive, rangeLabel, presetRange } from "@/lib/date-filter"

export interface PlanFilterValue {
  range: DateRange
  /** "" = todos */
  payment: "" | "CASH" | "CARD"
  /** "" = todas · "none" = sem categoria · senão id */
  categoryId: string
}

export const EMPTY_PLAN_FILTER: PlanFilterValue = { range: EMPTY_RANGE, payment: "", categoryId: "" }

export function countActiveFilters(v: PlanFilterValue): number {
  return (isRangeActive(v.range) ? 1 : 0) + (v.payment ? 1 : 0) + (v.categoryId ? 1 : 0)
}

interface Category {
  id: string
  name: string
  color: string
}

interface PlanFiltersProps {
  value: PlanFilterValue
  onChange: (v: PlanFilterValue) => void
  categories: Category[]
  min?: string
  max?: string
  /** Mostra atalhos de data */
  presets?: boolean
  /** Mostra filtros de pagamento/categoria (só fazem sentido para despesas) */
  showPayment?: boolean
  showCategory?: boolean
  label?: string
  size?: "sm" | "xs"
  className?: string
}

export function PlanFilters({
  value,
  onChange,
  categories,
  min,
  max,
  presets = false,
  showPayment = true,
  showCategory = true,
  label = "Filtros",
  size = "sm",
  className,
}: PlanFiltersProps) {
  const count = countActiveFilters(value)
  const active = count > 0
  const xs = size === "xs"

  const summary = (() => {
    const parts: string[] = []
    if (isRangeActive(value.range)) parts.push(rangeLabel(value.range))
    if (value.payment) parts.push(value.payment === "CARD" ? "Cartão" : "Dinheiro")
    if (value.categoryId) parts.push(value.categoryId === "none" ? "Sem categoria" : (categories.find((c) => c.id === value.categoryId)?.name ?? "Categoria"))
    return parts.join(" · ")
  })()

  return (
    <div className={cn("inline-flex items-center min-w-0", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={active ? "default" : "outline"}
            size="sm"
            className={cn(
              "font-semibold min-w-0",
              xs ? "h-7 text-xs px-2" : "h-8 text-xs",
              active && "rounded-r-none pr-2"
            )}
            title="Filtrar lançamentos"
          >
            <SlidersHorizontal className={cn("shrink-0", xs ? "h-3 w-3" : "h-3.5 w-3.5", "mr-1")} />
            <span className="truncate">{active ? summary : label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[300px] p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              <Input
                type="date"
                className="h-9"
                value={value.range.from}
                min={min}
                max={value.range.to || max}
                onChange={(e) => onChange({ ...value, range: { ...value.range, from: e.target.value } })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim</Label>
              <Input
                type="date"
                className="h-9"
                value={value.range.to}
                min={value.range.from || min}
                max={max}
                onChange={(e) => onChange({ ...value, range: { ...value.range, to: e.target.value } })}
              />
            </div>
          </div>
          {presets && (
            <div className="flex flex-wrap gap-1.5">
              {([["today", "Hoje"], ["week", "Esta semana"], ["next7", "Próximos 7 dias"]] as const).map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  className="text-[11px] px-2 py-1 rounded-full border bg-background hover:bg-muted"
                  onClick={() => onChange({ ...value, range: presetRange(k) })}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {showPayment && (
            <div className="space-y-1">
              <Label className="text-xs">Pagamento <span className="text-muted-foreground font-normal">(só despesas)</span></Label>
              <Select value={value.payment || "all"} onValueChange={(v) => onChange({ ...value, payment: v === "all" ? "" : (v as "CASH" | "CARD") })}>
                <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CASH">Dinheiro</SelectItem>
                  <SelectItem value="CARD">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {showCategory && (
            <div className="space-y-1">
              <Label className="text-xs">Categoria <span className="text-muted-foreground font-normal">(só despesas)</span></Label>
              <Select value={value.categoryId || "all"} onValueChange={(v) => onChange({ ...value, categoryId: v === "all" ? "" : v })}>
                <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="none">Sem categoria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground leading-snug">
            Data: só início → em diante; só fim → até. Com filtro de data ativo, itens sem data ficam ocultos.
          </p>
          {active && (
            <Button type="button" variant="ghost" size="sm" className="w-full h-8 text-xs" onClick={() => onChange(EMPTY_PLAN_FILTER)}>
              Limpar filtros
            </Button>
          )}
        </PopoverContent>
      </Popover>
      {active && (
        <Button
          type="button"
          variant="default"
          size="sm"
          className={cn("rounded-l-none border-l border-primary-foreground/20 px-1.5 shrink-0", xs ? "h-7" : "h-8")}
          onClick={() => onChange(EMPTY_PLAN_FILTER)}
          aria-label="Limpar filtros"
        >
          <X className={xs ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </Button>
      )}
    </div>
  )
}

/** Aplica o filtro a uma despesa */
export function expenseMatchesFilter(
  e: { dueDate: string | Date | null; paymentMethod: "CASH" | "CARD"; categoryId: string | null },
  v: PlanFilterValue,
  matchesRangeFn: (d: string | Date | null | undefined, ranges: Array<DateRange | undefined | null>) => boolean
): boolean {
  if (!matchesRangeFn(e.dueDate, [v.range])) return false
  if (v.payment && e.paymentMethod !== v.payment) return false
  if (v.categoryId === "none" && e.categoryId != null) return false
  if (v.categoryId && v.categoryId !== "none" && e.categoryId !== v.categoryId) return false
  return true
}
