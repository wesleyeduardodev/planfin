"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { DevelopedBy } from "@/components/shared/developed-by"

const COLLAPSE_KEY = "planfin:sidebar-collapsed"

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true)
    } catch {}
  }, [])

  function toggleCollapse() {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1") } catch {}
      return !c
    })
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 p-4 lg:p-6">
            {children}
          </div>
          <footer className="mt-6 bg-[#0b1220] px-4 lg:px-6 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 text-[11px] text-white/35">
            <span>© {new Date().getFullYear()} PlanFin</span>
            <DevelopedBy tone="dark" />
          </footer>
        </main>
      </div>
    </div>
  )
}
