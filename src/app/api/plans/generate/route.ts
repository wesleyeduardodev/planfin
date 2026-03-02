import { NextResponse } from "next/server"
import { getAuthUser, unauthorized, badRequest, serverError } from "@/lib/api-utils"
import { generateMonthlyPlan, copyMonthlyPlan } from "@/lib/plan-generator"

export async function POST(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const { year, month, mode = "generate" } = await request.json()
    if (!year || !month) return badRequest("Ano e mês são obrigatórios")

    let plan
    if (mode === "copy-fixed") {
      plan = await copyMonthlyPlan(user.id, year, month, true)
    } else if (mode === "copy-all") {
      plan = await copyMonthlyPlan(user.id, year, month, false)
    } else {
      plan = await generateMonthlyPlan(user.id, year, month)
    }

    return NextResponse.json(plan)
  } catch (error) {
    if (error instanceof Error && (error.message.includes("já existe") || error.message.includes("Nenhum plano"))) {
      return badRequest(error.message)
    }
    return serverError(error)
  }
}
