import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    let settings = await prisma.settings.findUnique({
      where: { userId: user.id },
    })
    if (!settings) {
      settings = await prisma.settings.create({
        data: { userId: user.id },
      })
    }
    return NextResponse.json(settings)
  } catch (error) {
    return serverError(error)
  }
}

export async function PUT(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()
    const settings = await prisma.settings.upsert({
      where: { userId: user.id },
      update: {
        salaryDay1: data.salaryDay1,
        salaryDay2: data.salaryDay2,
      },
      create: {
        userId: user.id,
        salaryDay1: data.salaryDay1 ?? 1,
        salaryDay2: data.salaryDay2 ?? 20,
      },
    })
    return NextResponse.json(settings)
  } catch (error) {
    return serverError(error)
  }
}
