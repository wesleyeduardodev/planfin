"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor, Palette, Hand } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useUserSettings, usePatchUserSettings } from "@/hooks/use-user-settings"

const THEMES = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const

export function AppearanceSettingsCard() {
  const { data: settings } = useUserSettings()
  const patch = usePatchUserSettings()
  const { setTheme } = useTheme()
  const current = settings?.themePreference ?? "system"
  const swipe = settings?.swipeActions ?? true

  function chooseTheme(v: "light" | "dark" | "system") {
    setTheme(v)
    patch.mutate({ themePreference: v })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="h-4 w-4" /> Aparência e gestos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="text-sm">Tema</Label>
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => chooseTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm transition-colors",
                  current === value
                    ? "border-primary bg-primary/5 text-primary font-semibold"
                    : "hover:bg-muted text-muted-foreground"
                )}
                aria-pressed={current === value}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Fica salvo na sua conta e vale em todos os aparelhos. &ldquo;Sistema&rdquo; segue o modo do celular/computador.
          </p>
        </div>

        <div className="pt-4 border-t">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border"
              checked={swipe}
              onChange={(e) => patch.mutate({ swipeActions: e.target.checked })}
            />
            <span className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium"><Hand className="h-4 w-4" /> Deslizar para pagar / excluir</span>
              <span className="block text-xs text-muted-foreground">
                No celular, arrastar um lançamento para a direita marca como pago/recebido e para a esquerda pede confirmação para excluir. Os botões continuam funcionando com isto desligado.
              </span>
            </span>
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
