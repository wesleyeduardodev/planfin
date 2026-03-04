"use client"

import { useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Check, Trash2 } from "lucide-react"

interface SwipeableCardProps {
  children: ReactNode
  className?: string
  onSwipeRight?: () => void
  onSwipeLeft?: () => void
  rightLabel?: string
  leftLabel?: string
  disableRight?: boolean
  disableLeft?: boolean
}

const THRESHOLD = 80

export function SwipeableCard({
  children,
  className,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = "Pago",
  leftLabel = "Excluir",
  disableRight = false,
  disableLeft = false,
}: SwipeableCardProps) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [swiping, setSwiping] = useState(false)

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    currentX.current = startX.current
    setSwiping(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!swiping) return
    currentX.current = e.touches[0].clientX
    let diff = currentX.current - startX.current

    // Clamp based on disabled directions
    if (disableRight && diff > 0) diff = 0
    if (disableLeft && diff < 0) diff = 0

    // Apply resistance after threshold
    const max = THRESHOLD + 40
    if (Math.abs(diff) > max) {
      diff = diff > 0 ? max : -max
    }

    setOffset(diff)
  }

  function handleTouchEnd() {
    setSwiping(false)

    if (offset > THRESHOLD && !disableRight && onSwipeRight) {
      onSwipeRight()
    } else if (offset < -THRESHOLD && !disableLeft && onSwipeLeft) {
      onSwipeLeft()
    }

    setOffset(0)
  }

  const showRight = offset > 30
  const showLeft = offset < -30

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe right background (green - pagar) */}
      {!disableRight && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-start pl-4 bg-emerald-500 text-white rounded-lg transition-opacity",
          showRight ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">{rightLabel}</span>
          </div>
        </div>
      )}

      {/* Swipe left background (red - excluir) */}
      {!disableLeft && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-end pr-4 bg-red-500 text-white rounded-lg transition-opacity",
          showLeft ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{leftLabel}</span>
            <Trash2 className="h-5 w-5" />
          </div>
        </div>
      )}

      {/* Card content */}
      <div
        className={cn("relative bg-card", className)}
        style={{
          transform: `translateX(${offset}px)`,
          transition: swiping ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
