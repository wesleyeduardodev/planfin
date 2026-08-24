"use client"

import { signOut, useSession } from "next-auth/react"
import { Menu, LogOut, Sun, Moon, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { usePatchUserSettings } from "@/hooks/use-user-settings"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"
import { PlanFinMark } from "@/components/auth/auth-shell"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const patchSettings = usePatchUserSettings()
  function changeTheme(v: string) {
    setTheme(v)
    patchSettings.mutate({ themePreference: v as "light" | "dark" | "system" })
  }
  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/95 backdrop-blur px-4 lg:px-6 pt-[env(safe-area-inset-top)] box-content">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Marca (só mobile; no desktop está na sidebar) */}
      <Link href="/" className="lg:hidden flex items-center gap-2 ml-1">
        <PlanFinMark className="w-8 h-8" gradId="pf-grad-header" />
        <span className="font-bold text-[17px] tracking-tight">PlanFin</span>
      </Link>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm">
              {session?.user?.name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Tema</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={changeTheme}>
            <DropdownMenuRadioItem value="light"><Sun className="mr-2 h-4 w-4" /> Claro</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark"><Moon className="mr-2 h-4 w-4" /> Escuro</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system"><Monitor className="mr-2 h-4 w-4" /> Sistema</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
