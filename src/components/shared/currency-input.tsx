"use client"

import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function CurrencyInput({
  value,
  onChange,
  className,
  placeholder = "0,00",
  disabled,
}: CurrencyInputProps) {
  const [display, setDisplay] = useState("")

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplay(
        value.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      )
    }
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d,]/g, "")
    setDisplay(raw)
  }

  function handleBlur() {
    const cleaned = display.replace(/\./g, "").replace(",", ".")
    const parsed = parseFloat(cleaned)
    if (!isNaN(parsed)) {
      onChange(parsed)
      setDisplay(
        parsed.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      )
    } else {
      onChange(0)
      setDisplay("0,00")
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        R$
      </span>
      <Input
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`pl-9 ${className || ""}`}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}
