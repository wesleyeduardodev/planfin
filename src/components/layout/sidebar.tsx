"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  CalendarRange,
  Tags,
  BarChart3,
  Settings,
  LogOut,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { nowBR } from "@/lib/format"

function PlanFinLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="32" height="32" rx="8" className="fill-sidebar-primary" />
      <path
        d="M8 22V18L12 14L16 17L24 10"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="10" r="2" fill="white" />
      <path
        d="M8 24H24"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planejamento", label: "Planejamento", icon: CalendarRange },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { year: currentYear, month: currentMonth } = nowBR()

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <PlanFinLogo className="w-8 h-8" />
            <span className="font-bold text-lg tracking-tight text-sidebar-foreground">
              PlanFin
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 px-3 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={
                  item.href === "/planejamento"
                    ? `/planejamento/${currentYear}/${currentMonth}`
                    : item.href
                }
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-accent/30">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-sidebar-foreground/60 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
