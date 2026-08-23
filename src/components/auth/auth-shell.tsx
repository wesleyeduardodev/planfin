"use client"

import { useId } from "react"
import { CheckCircle2, TrendingUp, Bell, CalendarRange } from "lucide-react"
import { DevelopedBy } from "@/components/shared/developed-by"

export function PlanFinMark({ className = "w-10 h-10" }: { className?: string }) {
  const id = useId()
  const gradId = `pf-grad-${id}`
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradId})`} />
      <path d="M8 22V18L12 14L16 17L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="10" r="2" fill="white" />
      <path d="M8 24H24" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

const highlights = [
  { icon: CalendarRange, text: "Divida o mês em períodos e saiba o saldo de cada um" },
  { icon: TrendingUp, text: "Projeção x real: veja se o mês fecha antes de fechar" },
  { icon: Bell, text: "Lembretes no celular na véspera e no dia do vencimento" },
]

function Glow() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-indigo-500/30 blur-3xl" />
      <div className="absolute bottom-0 -right-24 h-[420px] w-[420px] rounded-full bg-blue-600/25 blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
    </div>
  )
}

function PeriodPreview() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-sm p-4 text-[13px] shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-white/90">Período 2 · 20 a 30</span>
        <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">fecha no azul</span>
      </div>
      <ul className="space-y-2">
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-white/70"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><s>Aluguel</s></span>
          <span className="font-mono text-white/50">R$ 1.800,00</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-white/90"><span className="h-3.5 w-3.5 rounded-full border-2 border-amber-400" />Energia</span>
          <span className="font-mono text-white/90">R$ 230,00</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-white/90"><span className="h-3.5 w-3.5 rounded-full border-2 border-amber-400" />Supermercado</span>
          <span className="font-mono text-white/90">R$ 900,00</span>
        </li>
      </ul>
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-white/60">Saldo projetado</span>
        <span className="font-mono font-bold text-emerald-300 text-base">R$ 2.740,00</span>
      </div>
    </div>
  )
}

interface AuthShellProps {
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-[100svh] lg:min-h-[100dvh] flex flex-col lg:grid lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* Mobile: hero compacto */}
      <header className="relative lg:hidden overflow-hidden bg-[#0b1220] text-white px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-16">
        <Glow />
        <div className="relative flex items-center gap-2.5">
          <PlanFinMark className="w-9 h-9" />
          <span className="text-lg font-bold tracking-tight">PlanFin</span>
        </div>
        <h2 className="relative mt-6 text-[26px] font-bold leading-tight tracking-tight">
          Seu mês, período por período,<br />
          <span className="bg-gradient-to-r from-indigo-300 to-emerald-300 bg-clip-text text-transparent">sem surpresa no fim.</span>
        </h2>
      </header>

      {/* Painel de marca */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0b1220] text-white p-10 xl:p-14">
        <Glow />

        <div className="relative flex items-center gap-3">
          <PlanFinMark className="w-10 h-10" />
          <span className="text-xl font-bold tracking-tight">PlanFin</span>
        </div>

        <div className="relative max-w-md space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
              Seu mês, período por período,<br />
              <span className="bg-gradient-to-r from-indigo-300 to-emerald-300 bg-clip-text text-transparent">sem surpresa no fim.</span>
            </h2>
            <p className="mt-4 text-white/60 text-base leading-relaxed">
              Planeje receitas e despesas, marque o que já pagou e veja na hora se o mês fecha.
            </p>
          </div>

          <PeriodPreview />

          <ul className="space-y-3">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-white/75">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="h-3.5 w-3.5 text-indigo-200" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between gap-4 text-xs text-white/35">
          <span>© {new Date().getFullYear()} PlanFin</span>
          <DevelopedBy tone="dark" />
        </div>
      </aside>

      {/* Formulário */}
      <main className="relative flex-1 flex items-start lg:items-center justify-center px-4 pb-6 sm:px-8 lg:py-10 -mt-8 lg:mt-0">
        <div className="w-full max-w-[400px] rounded-2xl bg-card border shadow-xl shadow-black/10 p-6 sm:p-7 lg:p-0 lg:rounded-none lg:bg-transparent lg:border-0 lg:shadow-none">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          <p className="mt-7 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </main>

      {/* Mobile: faixa de rodapé escura, igual ao hero */}
      <footer className="lg:hidden mt-auto bg-[#0b1220] px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center justify-between text-[11px] text-white/35">
        <span>© {new Date().getFullYear()} PlanFin</span>
        <DevelopedBy tone="dark" />
      </footer>
    </div>
  )
}
