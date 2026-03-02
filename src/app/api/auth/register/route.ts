import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "A senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(password, 12)

    const defaultCategories = [
      { name: "Cartões", color: "#ef4444", order: 1 },
      { name: "Contas Fixas", color: "#3b82f6", order: 2 },
      { name: "Família", color: "#8b5cf6", order: 3 },
      { name: "Obra", color: "#f59e0b", order: 4 },
      { name: "Outros", color: "#6b7280", order: 5 },
    ]

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          hashedPassword,
          settings: {
            create: {
              salaryDay1: 1,
              salaryDay2: 20,
            },
          },
        },
      })

      await tx.category.createMany({
        data: defaultCategories.map((cat) => ({
          userId: newUser.id,
          name: cat.name,
          color: cat.color,
          order: cat.order,
        })),
      })

      return newUser
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Erro ao criar conta" },
      { status: 500 }
    )
  }
}
