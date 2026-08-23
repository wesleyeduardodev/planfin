"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"
import {
  CalendarRange,
  Tags,
  BarChart3,
  Settings,
  LogOut,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"

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
  { href: "/planejamento", label: "Planejamento", icon: CalendarRange },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname.startsWith(href)

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
          "fixed left-0 top-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transition-[transform,width] duration-200 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-[68px]"
        )}
      >
        {/* Logo */}
        <div className={cn("flex h-16 items-center justify-between px-5 pt-[env(safe-area-inset-top)] box-content", collapsed && "lg:px-0 lg:justify-center")}>
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose} title="PlanFin">
            <PlanFinLogo className="w-8 h-8 shrink-0" />
            <span className={cn("font-bold text-lg tracking-tight text-sidebar-foreground", collapsed && "lg:hidden")}>
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
                href={item.href === "/planejamento" ? "/" : item.href}
                onClick={onClose}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  collapsed && "lg:justify-center lg:px-0",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className={cn(collapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle (desktop) + Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-sidebar-accent/30 space-y-0.5">
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "hidden lg:flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-all duration-150",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" /> : <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />}
            {!collapsed && "Recolher"}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={collapsed ? "Sair" : undefined}
            aria-label="Sair"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium w-full text-sidebar-foreground/60 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150",
              collapsed && "lg:justify-center lg:px-0"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            <span className={cn(collapsed && "lg:hidden")}>Sair</span>
          </button>
        </div>
      </aside>
    </>
  )
}
