import webpush from "web-push"
import { prisma } from "@/lib/prisma"

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

let configured = false
function ensureConfigured(): boolean {
  if (configured) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@planfin.app"
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
  return true
}

export function pushConfigured(): boolean {
  return ensureConfigured()
}

const MAX_FAILURES = 5

/**
 * Envia a notificação para todos os aparelhos do usuário.
 * Remove subscriptions inválidas (404/410) ou com falhas acumuladas.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) return { sent: 0, removed: 0 }

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  let sent = 0
  let removed = 0
  const body = JSON.stringify(payload)

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
        { TTL: 60 * 60 * 6 }
      )
      sent++
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date(), failures: 0 },
      })
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode
      if (status === 404 || status === 410 || sub.failures + 1 >= MAX_FAILURES) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        removed++
      } else {
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { failures: { increment: 1 } },
        }).catch(() => {})
      }
    }
  }
  return { sent, removed }
}
