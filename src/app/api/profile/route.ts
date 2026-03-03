import { NextResponse } from "next/server"
import { hash, compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, badRequest, serverError } from "@/lib/api-utils"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, createdAt: true },
    })
    return NextResponse.json(profile)
  } catch (error) {
    return serverError(error)
  }
}

export async function PUT(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const data = await request.json()
    const { name, email, currentPassword, newPassword } = data

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) return unauthorized()

    // Se está alterando senha, verificar senha atual
    if (newPassword) {
      if (!currentPassword) {
        return badRequest("Informe a senha atual")
      }
      if (newPassword.length < 6) {
        return badRequest("A nova senha deve ter no mínimo 6 caracteres")
      }
      const isValid = await compare(currentPassword, dbUser.hashedPassword)
      if (!isValid) {
        return badRequest("Senha atual incorreta")
      }
    }

    // Se está alterando email, verificar se já existe
    if (email && email !== dbUser.email) {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) {
        return badRequest("Este email já está em uso")
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (newPassword) updateData.hashedPassword = await hash(newPassword, 12)

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return serverError(error)
  }
}

export async function DELETE() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    await prisma.user.delete({ where: { id: user.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return serverError(error)
  }
}
