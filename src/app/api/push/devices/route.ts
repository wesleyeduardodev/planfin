import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"
import { pushConfigured } from "@/lib/push"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()
  try {
    const devices = await prisma.pushSubscription.findMany({
      where: { userId: user.id },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({
      configured: pushConfigured(),
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
      devices,
    })
  } catch (error) {
    return serverError(error)
  }
}
