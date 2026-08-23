"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export interface UserSettings {
  id: string
  periodCount: number
  periodDays: number[]
  remindersEnabled: boolean
  reminderEveHour: number
  reminderDayHour: number
  remindExpenses: boolean
  remindIncomes: boolean
  themePreference: "light" | "dark" | "system"
  swipeActions: boolean
  showFab: boolean
}

export type UserSettingsPatch = Partial<Pick<UserSettings,
  "reminderEveHour" | "reminderDayHour" | "remindExpenses" | "remindIncomes" | "remindersEnabled" | "themePreference" | "swipeActions" | "showFab"
>>

/** Configurações do usuário (cache compartilhado por toda a UI) */
export function useUserSettings() {
  return useQuery<UserSettings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  })
}

/** Atualiza preferências (PATCH) com atualização otimista do cache */
export function usePatchUserSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: UserSettingsPatch) => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error("Erro ao salvar preferência")
      return res.json() as Promise<UserSettings>
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ["settings"] })
      const prev = qc.getQueryData<UserSettings>(["settings"])
      if (prev) qc.setQueryData<UserSettings>(["settings"], { ...prev, ...patch })
      return { prev }
    },
    onError: (_e, _p, ctx) => { if (ctx?.prev) qc.setQueryData(["settings"], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  })
}
