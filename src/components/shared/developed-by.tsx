import { cn } from "@/lib/utils"

/** Mini-marca da WMelo Tech: "W" dentro de um círculo verde-água */
function WMeloMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 8L9 16L12 9.5L15 16L17.5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface DevelopedByProps {
  /** "dark" para fundos escuros (sidebar, painel do login), "light" para fundos claros */
  tone?: "dark" | "light"
  className?: string
}

export function DevelopedBy({ tone = "light", className }: DevelopedByProps) {
  const dark = tone === "dark"
  return (
    <a
      href="https://wmelotech.com.br"
      target="_blank"
      rel="noopener noreferrer"
      title="WMelo Tech — desenvolvimento de software"
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] transition-colors",
        dark ? "text-white/40 hover:text-white/80" : "text-muted-foreground/70 hover:text-foreground",
        className
      )}
    >
      <span>Desenvolvido por</span>
      <span className="inline-flex items-center gap-1 font-semibold">
        <WMeloMark className="h-3.5 w-3.5 text-[#12d8a8]" />
        <span className={dark ? "text-white/70" : "text-foreground/80"}>WMelo</span>
        <span className="text-[#12d8a8]">Tech</span>
      </span>
    </a>
  )
}
