import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const categories = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
    })
    return NextResponse.json(categories)
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const { name, color, order } = await request.json()
    const category = await prisma.category.create({
      data: { userId: user.id, name, color, order: order ?? 0 },
    })
    return NextResponse.json(category)
  } catch (error) {
    return serverError(error)
  }
}
