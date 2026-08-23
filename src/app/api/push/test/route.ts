import { NextResponse } from "next/server"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"
import { sendToUser, pushConfigured } from "@/lib/push"

export async function POST() {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  try {
    if (!pushConfigured()) {
      return NextResponse.json({ error: "Push não configurado no servidor (chaves VAPID)" }, { status: 503 })
    }
    const r = await sendToUser(user.id, {
      title: "PlanFin — teste de lembrete",
      body: "Se você está vendo isto, os lembretes estão funcionando. 🎉",
      url: "/configuracoes",
      tag: "test",
    })
    return NextResponse.json(r)
  } catch (error) {
    return serverError(error)
  }
}
