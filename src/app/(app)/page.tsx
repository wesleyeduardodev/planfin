import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/api-utils"
import { nowBR } from "@/lib/format"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const { year, month } = nowBR()

  const currentPlan = await prisma.monthlyPlan.findUnique({
    where: { userId_year_month: { userId: user.id, year, month } },
    select: { id: true },
  })
  if (currentPlan) redirect(`/planejamento/${year}/${month}`)

  const latestPlan = await prisma.monthlyPlan.findFirst({
    where: { userId: user.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    select: { year: true, month: true },
  })
  if (latestPlan) redirect(`/planejamento/${latestPlan.year}/${latestPlan.month}`)

  redirect(`/planejamento/${year}/${month}`)
}
