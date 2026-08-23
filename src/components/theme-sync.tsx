"use client"

import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { useUserSettings } from "@/hooks/use-user-settings"

/** Aplica o tema salvo na conta do usuário ao carregar o app. */
export function ThemeSync() {
  const { data } = useUserSettings()
  const { setTheme } = useTheme()
  const applied = useRef<string | null>(null)
  useEffect(() => {
    const pref = data?.themePreference
    if (pref && applied.current !== pref) {
      applied.current = pref
      setTheme(pref)
    }
  }, [data?.themePreference, setTheme])
  return null
}
