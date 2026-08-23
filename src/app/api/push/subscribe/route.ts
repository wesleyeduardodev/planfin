import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

// Registra (ou atualiza) a subscription push deste aparelho e liga os lembretes.
export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()
    const sub = data.subscription
    const endpoint: string | undefined = sub?.endpoint
    const p256dh: string | undefined = sub?.keys?.p256dh
    const auth: string | undefined = sub?.keys?.auth
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Subscription inválida" }, { status: 400 })
    }
    const userAgent = typeof data.userAgent === "string" ? data.userAgent.slice(0, 200) : null

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh, auth, userAgent },
      update: { userId: user.id, p256dh, auth, userAgent, failures: 0 },
    })
    await prisma.settings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, remindersEnabled: true },
      update: { remindersEnabled: true },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return serverError(error)
  }
}

// Remove a subscription deste aparelho; desliga lembretes se não sobrar nenhuma.
export async function DELETE(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json().catch(() => ({}))
    const endpoint: string | undefined = data.endpoint
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } })
    }
    const remaining = await prisma.pushSubscription.count({ where: { userId: user.id } })
    if (remaining === 0) {
      await prisma.settings.updateMany({ where: { userId: user.id }, data: { remindersEnabled: false } })
    }
    return NextResponse.json({ ok: true, remaining })
  } catch (error) {
    return serverError(error)
  }
}
