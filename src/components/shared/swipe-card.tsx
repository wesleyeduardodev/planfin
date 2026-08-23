"use client"

import { Check, Trash2 } from "lucide-react"
import { useSwipeActions } from "@/hooks/use-swipe-actions"
import { cn } from "@/lib/utils"
import { useUserSettings } from "@/hooks/use-user-settings"

interface SwipeCardProps {
  children: React.ReactNode
  className?: string
  /** Deslizar para a direita */
  onSwipeRight?: () => void
  rightLabel?: string
  /** Deslizar para a esquerda */
  onSwipeLeft?: () => void
  leftLabel?: string
}

/**
 * Card com gesto de deslizar (mobile): direita revela ação verde (ex.: pagar),
 * esquerda revela ação vermelha (ex.: excluir).
 */
export function SwipeCard({ children, className, onSwipeRight, rightLabel = "Pagar", onSwipeLeft, leftLabel = "Excluir" }: SwipeCardProps) {
  const { data: settings } = useUserSettings()
  const enabled = settings?.swipeActions !== false
  const { dx, swiping, handlers } = useSwipeActions({ onRight: enabled ? onSwipeRight : undefined, onLeft: enabled ? onSwipeLeft : undefined })
  const progress = Math.min(1, Math.abs(dx) / 80)

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* fundo revelado */}
      {dx > 0 && onSwipeRight && (
        <div className="absolute inset-0 flex items-center justify-start pl-4 bg-emerald-500 text-white rounded-lg" style={{ opacity: 0.4 + progress * 0.6 }}>
          <Check className="h-5 w-5 mr-2" /> <span className="text-sm font-semibold">{rightLabel}</span>
        </div>
      )}
      {dx < 0 && onSwipeLeft && (
        <div className="absolute inset-0 flex items-center justify-end pr-4 bg-red-500 text-white rounded-lg" style={{ opacity: 0.4 + progress * 0.6 }}>
          <span className="text-sm font-semibold">{leftLabel}</span> <Trash2 className="h-5 w-5 ml-2" />
        </div>
      )}
      <div
        {...handlers}
        className={cn("relative", !swiping && "transition-transform duration-150", className)}
        style={{ transform: `translateX(${dx}px)` }}
      >
        {children}
      </div>
    </div>
  )
}
