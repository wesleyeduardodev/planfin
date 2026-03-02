import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const sources = await prisma.incomeSource.findMany({
      where: { userId: user.id },
      orderBy: [{ period: "asc" }, { description: "asc" }],
    })
    return NextResponse.json(sources)
  } catch (error) {
    return serverError(error)
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()
    const source = await prisma.incomeSource.create({
      data: {
        userId: user.id,
        description: data.description,
        amount: data.amount,
        period: data.period,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(source)
  } catch (error) {
    return serverError(error)
  }
}
