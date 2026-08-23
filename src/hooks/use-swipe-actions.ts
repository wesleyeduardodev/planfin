"use client"

import { useRef, useState, type TouchEvent } from "react"

interface SwipeOptions {
  /** Deslizar para a direita (ex.: pagar). Se ausente, o gesto é ignorado. */
  onRight?: () => void
  /** Deslizar para a esquerda (ex.: excluir). */
  onLeft?: () => void
  /** Distância mínima em px para disparar */
  threshold?: number
}

/**
 * Gesto de deslizar horizontal em cards (mobile).
 * Retorna props para o elemento e o deslocamento atual para feedback visual.
 */
export function useSwipeActions({ onRight, onLeft, threshold = 80 }: SwipeOptions) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const locked = useRef<"h" | "v" | null>(null)
  const [dx, setDx] = useState(0)

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
    locked.current = null
  }

  function onTouchMove(e: TouchEvent) {
    if (startX.current == null || startY.current == null) return
    const t = e.touches[0]
    const mx = t.clientX - startX.current
    const my = t.clientY - startY.current
    if (!locked.current) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
      locked.current = Math.abs(mx) > Math.abs(my) ? "h" : "v"
    }
    if (locked.current !== "h") return
    // só permite a direção que tem ação
    const clamped = Math.max(onLeft ? -140 : 0, Math.min(onRight ? 140 : 0, mx))
    setDx(clamped)
  }

  function onTouchEnd() {
    if (locked.current === "h") {
      if (dx >= threshold && onRight) onRight()
      else if (dx <= -threshold && onLeft) onLeft()
    }
    setDx(0)
    startX.current = null
    startY.current = null
    locked.current = null
  }

  return {
    dx,
    swiping: dx !== 0,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  }
}
