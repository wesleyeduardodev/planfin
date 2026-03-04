import path from "path"
import type { TDocumentDefinitions, Content, TableCell } from "pdfmake/interfaces"
import { formatCurrency, formatShortDate, getMonthName } from "./format"
import { calcPeriodSummary } from "./calculations"
import { getPeriodLabel } from "./periods"

export interface ExportPlan {
  year: number
  month: number
  cutDays: number[]
  initialBalance: number
  expenses: {
    period: number
    description: string
    dueDate: Date | null
    plannedAmount: number
    paidAmount: number
    isFixed: boolean
    category: { name: string; color: string } | null
  }[]
  incomes: {
    period: number
    description: string
    dueDate: Date | null
    expectedAmount: number
    receivedAmount: number
    isFixed: boolean
  }[]
}

const COLORS = {
  header: "#1e3a5f",
  green: "#10b981",
  red: "#ef4444",
  incomeHeaderBg: "#ecfdf5",
  expenseHeaderBg: "#fef2f2",
  zebra: "#f8fafc",
  border: "#e2e8f0",
}

function createPrinter() {
  // pdfmake 0.3.x: server-side Printer is at pdfmake/js/Printer
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PrinterModule = require("pdfmake/js/Printer")
  const Printer = PrinterModule.default || PrinterModule
  const fontDir = path.resolve(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto")
  return new Printer({
    Roboto: {
      normal: path.join(fontDir, "Roboto-Regular.ttf"),
      bold: path.join(fontDir, "Roboto-Medium.ttf"),
      italics: path.join(fontDir, "Roboto-Italic.ttf"),
      bolditalics: path.join(fontDir, "Roboto-MediumItalic.ttf"),
    },
  })
}

export async function generatePlanPDF(plans: ExportPlan[]): Promise<Buffer> {
  const printer = createPrinter()
  const content: Content[] = []

  for (let planIndex = 0; planIndex < plans.length; planIndex++) {
    const plan = plans[planIndex]
    if (planIndex > 0) {
      content.push({ text: "", pageBreak: "before" })
    }

    const daysInMonth = new Date(plan.year, plan.month, 0).getDate()
    const periodCount = plan.cutDays.length

    // Header
    content.push({
      text: "PlanFin — Planejamento Financeiro",
      style: "header",
      margin: [0, 0, 0, 4],
    } as Content)
    content.push({
      text: `${getMonthName(plan.month)} ${plan.year}`,
      style: "subheader",
      margin: [0, 0, 0, 4],
    } as Content)
    content.push({
      text: `Saldo Inicial: ${formatCurrency(plan.initialBalance)}`,
      fontSize: 11,
      color: "#475569",
      margin: [0, 0, 0, 16],
    } as Content)

    let entryBalance = plan.initialBalance
    let realEntryBalance = plan.initialBalance

    for (let p = 1; p <= periodCount; p++) {
      const periodExpenses = plan.expenses.filter((e) => e.period === p)
      const periodIncomes = plan.incomes.filter((i) => i.period === p)
      const summary = calcPeriodSummary(entryBalance, periodExpenses, periodIncomes, realEntryBalance)
      const label = getPeriodLabel(plan.cutDays, p, daysInMonth)

      // Period header
      content.push({
        text: label,
        style: "periodHeader",
        margin: [0, 12, 0, 8],
      } as Content)

      // --- RECEITAS ---
      if (periodIncomes.length > 0) {
        content.push({
          text: "RECEITAS",
          fontSize: 10,
          bold: true,
          color: COLORS.green,
          margin: [0, 4, 0, 4],
        } as Content)

        const incomeBody: TableCell[][] = [
          [
            { text: "Descrição", style: "tableHeader" },
            { text: "Tipo", style: "tableHeader" },
            { text: "Vencimento", style: "tableHeader" },
            { text: "Esperado", style: "tableHeader", alignment: "right" },
            { text: "Recebido", style: "tableHeader", alignment: "right" },
          ],
        ]

        for (const inc of periodIncomes) {
          incomeBody.push([
            inc.description,
            inc.isFixed ? "Fixa" : "Variável",
            inc.dueDate ? formatShortDate(inc.dueDate) : "-",
            { text: formatCurrency(inc.expectedAmount), alignment: "right" },
            { text: formatCurrency(inc.receivedAmount), alignment: "right" },
          ])
        }

        incomeBody.push([
          { text: "Total", bold: true, colSpan: 3 },
          {},
          {},
          { text: formatCurrency(summary.totalIncome), bold: true, alignment: "right" },
          { text: formatCurrency(summary.totalReceived), bold: true, alignment: "right" },
        ])

        content.push({
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto", "auto"],
            body: incomeBody,
          },
          layout: {
            fillColor: (rowIndex: number) =>
              rowIndex === 0 ? COLORS.incomeHeaderBg : rowIndex % 2 === 0 ? COLORS.zebra : null,
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.border,
            vLineColor: () => COLORS.border,
          },
          margin: [0, 0, 0, 8],
        } as Content)
      }

      // --- DESPESAS ---
      if (periodExpenses.length > 0) {
        content.push({
          text: "DESPESAS",
          fontSize: 10,
          bold: true,
          color: COLORS.red,
          margin: [0, 4, 0, 4],
        } as Content)

        const expenseBody: TableCell[][] = [
          [
            { text: "Categoria", style: "tableHeader" },
            { text: "Descrição", style: "tableHeader" },
            { text: "Tipo", style: "tableHeader" },
            { text: "Vencimento", style: "tableHeader" },
            { text: "Valor", style: "tableHeader", alignment: "right" },
            { text: "Pago", style: "tableHeader", alignment: "right" },
          ],
        ]

        for (const exp of periodExpenses) {
          expenseBody.push([
            { text: exp.category?.name || "-", color: exp.category?.color || "#6b7280" },
            exp.description,
            exp.isFixed ? "Fixa" : "Variável",
            exp.dueDate ? formatShortDate(exp.dueDate) : "-",
            { text: formatCurrency(exp.plannedAmount), alignment: "right" },
            { text: formatCurrency(exp.paidAmount), alignment: "right" },
          ])
        }

        expenseBody.push([
          { text: "Total", bold: true, colSpan: 4 },
          {},
          {},
          {},
          { text: formatCurrency(summary.totalExpenses), bold: true, alignment: "right" },
          { text: formatCurrency(summary.totalPaid), bold: true, alignment: "right" },
        ])

        content.push({
          table: {
            headerRows: 1,
            widths: ["auto", "*", "auto", "auto", "auto", "auto"],
            body: expenseBody,
          },
          layout: {
            fillColor: (rowIndex: number) =>
              rowIndex === 0 ? COLORS.expenseHeaderBg : rowIndex % 2 === 0 ? COLORS.zebra : null,
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => COLORS.border,
            vLineColor: () => COLORS.border,
          },
          margin: [0, 0, 0, 8],
        } as Content)
      }

      // Period summary
      content.push({
        columns: [
          { text: `Receitas: ${formatCurrency(summary.totalIncome)}`, color: COLORS.green, width: "auto" },
          { text: "  |  ", width: "auto", color: "#94a3b8" },
          { text: `Despesas: ${formatCurrency(summary.totalExpenses)}`, color: COLORS.red, width: "auto" },
        ],
        margin: [0, 4, 0, 2],
      } as Content)
      content.push({
        columns: [
          { text: `Saldo Projetado: ${formatCurrency(summary.balance)}`, bold: true, width: "auto" },
          { text: "  |  ", width: "auto", color: "#94a3b8" },
          { text: `Saldo Real: ${formatCurrency(summary.realBalance)}`, bold: true, width: "auto" },
        ],
        margin: [0, 0, 0, 8],
      } as Content)

      entryBalance = summary.balance
      realEntryBalance = summary.realBalance
    }

    // Month summary
    const totalPlanned = plan.expenses.reduce((s, e) => s + e.plannedAmount, 0)
    const totalExpected = plan.incomes.reduce((s, i) => s + i.expectedAmount, 0)

    content.push({
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: COLORS.header }],
      margin: [0, 12, 0, 8],
    } as Content)
    content.push({
      text: "RESUMO FINAL DO MÊS",
      fontSize: 12,
      bold: true,
      color: COLORS.header,
      margin: [0, 0, 0, 4],
    } as Content)
    content.push({
      text: `Total Receitas: ${formatCurrency(totalExpected)}  |  Total Despesas: ${formatCurrency(totalPlanned)}`,
      margin: [0, 2, 0, 2],
    } as Content)
    content.push({
      text: `Saldo Final Projetado: ${formatCurrency(entryBalance)}`,
      bold: true,
      margin: [0, 2, 0, 2],
    } as Content)
    content.push({
      text: `Saldo Final Real: ${formatCurrency(realEntryBalance)}`,
      bold: true,
      margin: [0, 2, 0, 0],
    } as Content)
  }

  const now = new Date()
  const dateStr = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Fortaleza",
  }).format(now)

  const docDefinition: TDocumentDefinitions = {
    content,
    styles: {
      header: { fontSize: 16, bold: true, color: COLORS.header },
      subheader: { fontSize: 14, bold: true, color: COLORS.header },
      periodHeader: { fontSize: 12, bold: true, color: COLORS.header, decoration: "underline" },
      tableHeader: { fontSize: 9, bold: true, color: "#1e293b" },
    },
    defaultStyle: { font: "Roboto", fontSize: 9 },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `PlanFin — Gerado em ${dateStr}`,
          alignment: "left" as const,
          fontSize: 8,
          color: "#94a3b8",
          margin: [40, 0, 0, 0] as [number, number, number, number],
        },
        {
          text: `${currentPage}/${pageCount}`,
          alignment: "right" as const,
          fontSize: 8,
          color: "#94a3b8",
          margin: [0, 0, 40, 0] as [number, number, number, number],
        },
      ],
    }),
    pageMargins: [40, 40, 40, 40],
  }

  // pdfmake 0.3.x: createPdfKitDocument is async
  const pdfDoc = await printer.createPdfKitDocument(docDefinition)

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    pdfDoc.on("data", (chunk: Buffer) => chunks.push(chunk))
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))
    pdfDoc.on("error", reject)
    pdfDoc.end()
  })
}
