"use client"

import { CalendarDays, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { type DateRange, EMPTY_RANGE, isRangeActive, rangeLabel, presetRange } from "@/lib/date-filter"

interface DateRangeFilterProps {
  value: DateRange
  onChange: (r: DateRange) => void
  /** Limites do mês (yyyy-MM-dd) para os inputs */
  min?: string
  max?: string
  /** Texto do botão quando inativo */
  label?: string
  /** Mostra atalhos Hoje / Esta semana / Próximos 7 dias */
  presets?: boolean
  size?: "sm" | "xs"
  className?: string
}

export function DateRangeFilter({ value, onChange, min, max, label = "Filtrar por data", presets = false, size = "sm", className }: DateRangeFilterProps) {
  const active = isRangeActive(value)
  const xs = size === "xs"

  return (
    <div className={cn("inline-flex items-center", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={active ? "default" : "outline"}
            size="sm"
            className={cn(
              "font-semibold",
              xs ? "h-7 text-xs px-2" : "h-8 text-xs",
              active && "rounded-r-none pr-2"
            )}
            title="Filtrar por data de vencimento"
          >
            <CalendarDays className={cn("shrink-0", xs ? "h-3 w-3" : "h-3.5 w-3.5", "mr-1")} />
            {active ? rangeLabel(value) : label}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[280px] p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              <Input
                type="date"
                className="h-9"
                value={value.from}
                min={min}
                max={value.to || max}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim</Label>
              <Input
                type="date"
                className="h-9"
                value={value.to}
                min={value.from || min}
                max={max}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
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
                  onClick={() => onChange(presetRange(k))}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground leading-snug">
            Só início → desse dia em diante. Só fim → até esse dia. Itens sem data ficam ocultos.
          </p>
          {active && (
            <Button type="button" variant="ghost" size="sm" className="w-full h-8 text-xs" onClick={() => onChange(EMPTY_RANGE)}>
              Limpar filtro
            </Button>
          )}
        </PopoverContent>
      </Popover>
      {active && (
        <Button
          type="button"
          variant="default"
          size="sm"
          className={cn("rounded-l-none border-l border-primary-foreground/20 px-1.5", xs ? "h-7" : "h-8")}
          onClick={() => onChange(EMPTY_RANGE)}
          aria-label="Limpar filtro de data"
        >
          <X className={xs ? "h-3 w-3" : "h-3.5 w-3.5"} />
        </Button>
      )}
    </div>
  )
}
