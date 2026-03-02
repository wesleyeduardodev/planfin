import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, badRequest, serverError } from "@/lib/api-utils"
import { generatePlanPDF } from "@/lib/export-pdf"
import { getMonthName } from "@/lib/format"

export async function GET(request: Request) {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const { searchParams } = new URL(request.url)
    const monthsParam = searchParams.get("months")

    if (!monthsParam) {
      return badRequest("Parâmetro 'months' é obrigatório (ex: 2026-03,2026-04 ou all)")
    }

    // Build where clause based on months parameter
    const where: { userId: string; OR?: { year: number; month: number }[] } = {
      userId: user.id,
    }

    if (monthsParam !== "all") {
      const monthPairs = monthsParam.split(",").map((m) => {
        const [year, month] = m.trim().split("-").map(Number)
        return { year, month }
      })

      if (monthPairs.some((p) => !p.year || !p.month)) {
        return badRequest("Formato inválido. Use: 2026-03,2026-04 ou all")
      }

      where.OR = monthPairs
    }

    const plans = await prisma.monthlyPlan.findMany({
      where,
      include: {
        expenses: {
          include: { category: true },
          orderBy: [{ period: "asc" }, { dueDate: "asc" }],
        },
        incomes: {
          orderBy: [{ period: "asc" }, { dueDate: "asc" }],
        },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    })

    if (plans.length === 0) {
      return badRequest("Nenhum plano encontrado para os meses selecionados")
    }

    const pdfBuffer = await generatePlanPDF(plans)

    const fileName = plans.length === 1
      ? `planfin-${getMonthName(plans[0].month).toLowerCase()}-${plans[0].year}.pdf`
      : `planfin-relatorio.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    return serverError(error)
  }
}
