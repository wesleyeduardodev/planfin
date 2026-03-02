import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const hashedPassword = await hash("admin123", 12)
  const user = await prisma.user.upsert({
    where: { email: "admin@planfin.com" },
    update: {},
    create: {
      name: "Wesley",
      email: "admin@planfin.com",
      hashedPassword,
      settings: {
        create: {
          salaryDay1: 1,
          salaryDay2: 20,
        },
      },
    },
  })

  // Create default categories
  const categories = [
    { name: "Cartões", color: "#ef4444", order: 1 },
    { name: "Contas Fixas", color: "#3b82f6", order: 2 },
    { name: "Família", color: "#8b5cf6", order: 3 },
    { name: "Obra", color: "#f59e0b", order: 4 },
    { name: "Outros", color: "#6b7280", order: 5 },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: cat.name } },
      update: { color: cat.color, order: cat.order },
      create: {
        userId: user.id,
        name: cat.name,
        color: cat.color,
        order: cat.order,
      },
    })
  }

  console.log("Seed completed successfully!")
  console.log(`User: ${user.email} / admin123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
