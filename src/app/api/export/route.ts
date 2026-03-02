import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser, unauthorized, serverError } from "@/lib/api-utils"
import { getMonthName } from "@/lib/format"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return unauthorized()

  try {
    const plans = await prisma.monthlyPlan.findMany({
      where: { userId: user.id },
      include: {
        expenses: { include: { category: true } },
        incomes: true,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    })

    const lines: string[] = []
    lines.push(
      "Mês,Tipo,Período,Descrição,Categoria,Valor Planejado,Valor Pago,Restante"
    )

    for (const plan of plans) {
      const monthLabel = `${getMonthName(plan.month)} ${plan.year}`

      for (const exp of plan.expenses) {
        lines.push(
          [
            monthLabel,
            "Despesa",
            `Período ${exp.period}`,
            `"${exp.description}"`,
            exp.category?.name || "",
            exp.plannedAmount.toFixed(2),
            exp.paidAmount.toFixed(2),
            (exp.plannedAmount - exp.paidAmount).toFixed(2),
          ].join(",")
        )
      }

      for (const inc of plan.incomes) {
        lines.push(
          [
            monthLabel,
            "Receita",
            `Período ${inc.period}`,
            `"${inc.description}"`,
            "",
            inc.expectedAmount.toFixed(2),
            inc.receivedAmount.toFixed(2),
            (inc.expectedAmount - inc.receivedAmount).toFixed(2),
          ].join(",")
        )
      }
    }

    const csv = lines.join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="planfin-export.csv"`,
      },
    })
  } catch (error) {
    return serverError(error)
  }
}
