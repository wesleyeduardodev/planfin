import { NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { runReminders } from "@/lib/reminders"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // segundos (limite do plano Hobby da Vercel)

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : new URL(request.url).searchParams.get("key") ?? ""
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Chamado pelo agendador (GitHub Actions) de hora em hora.
// ?kind=eve|day força o tipo (para testes manuais; ignora o log de envio).
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Not found" }, { status: 404 })
  try {
    const kind = new URL(request.url).searchParams.get("kind")
    const result = await runReminders(kind === "eve" || kind === "day" ? kind : undefined)
    return NextResponse.json(result)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
