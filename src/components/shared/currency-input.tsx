"use client"

import { Input } from "@/components/ui/input"
import { useRef, useEffect } from "react"

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function CurrencyInput({
  value,
  onChange,
  className,
  placeholder = "0,00",
  disabled,
}: CurrencyInputProps) {
  const centsRef = useRef(Math.round(value * 100))

  useEffect(() => {
    centsRef.current = Math.round(value * 100)
  }, [value])

  const display = formatCents(centsRef.current)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "")
    const cents = parseInt(digits, 10) || 0
    centsRef.current = cents
    onChange(cents / 100)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault()
      const cents = Math.floor(centsRef.current / 10)
      centsRef.current = cents
      onChange(cents / 100)
    }
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
        R$
      </span>
      <Input
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={`pl-9 ${className || ""}`}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  )
}
