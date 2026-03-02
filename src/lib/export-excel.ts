import ExcelJS from "exceljs"
import { formatCurrency, formatShortDate, getMonthName } from "./format"
import { calcPeriodSummary } from "./calculations"
import { getPeriodLabel } from "./periods"
import type { ExportPlan } from "./export-pdf"

const COLORS = {
  headerBg: "FF1e3a5f",
  headerText: "FFFFFFFF",
  periodBg: "FFe2e8f0",
  incomeHeaderBg: "FFdcfce7",
  incomeText: "FF10b981",
  expenseHeaderBg: "FFfee2e2",
  expenseText: "FFef4444",
  zebra: "FFf8fafc",
  border: "FFe2e8f0",
  summaryBg: "FFf1f5f9",
}

function applyThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: COLORS.border } },
    bottom: { style: "thin", color: { argb: COLORS.border } },
    left: { style: "thin", color: { argb: COLORS.border } },
    right: { style: "thin", color: { argb: COLORS.border } },
  }
}

function applyCurrencyFormat(cell: ExcelJS.Cell) {
  cell.numFmt = '#.##0,00'
  cell.alignment = { horizontal: "right" }
}

function setRowValues(sheet: ExcelJS.Worksheet, rowNum: number, values: (string | number | null)[], options?: {
  bold?: boolean
  fill?: string
  fontColor?: string
  isHeader?: boolean
  isCurrency?: boolean[]
  categoryColor?: string
}) {
  const row = sheet.getRow(rowNum)
  values.forEach((val, colIdx) => {
    const cell = row.getCell(colIdx + 1)
    if (val !== null) cell.value = val
    applyThinBorder(cell)

    if (options?.bold) cell.font = { ...cell.font, bold: true }
    if (options?.fontColor) cell.font = { ...cell.font, color: { argb: options.fontColor } }
    if (options?.fill) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: options.fill } }
    }
    if (options?.isHeader) {
      cell.font = { bold: true, color: { argb: "FF1e293b" }, size: 10 }
    }
    if (options?.isCurrency?.[colIdx]) {
      applyCurrencyFormat(cell)
    }
    if (colIdx === 0 && options?.categoryColor) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${options.categoryColor.replace("#", "")}` } }
      cell.font = { ...cell.font, color: { argb: "FFFFFFFF" }, bold: true }
    }
  })
  return rowNum + 1
}

export async function generatePlanExcel(plans: ExportPlan[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "PlanFin"
  workbook.created = new Date()

  for (const plan of plans) {
    const monthName = getMonthName(plan.month)
    const sheetName = `${monthName.slice(0, 3)} ${plan.year}`
    const sheet = workbook.addWorksheet(sheetName)

    const daysInMonth = new Date(plan.year, plan.month, 0).getDate()
    const periodCount = plan.cutDays.length

    // Column widths
    sheet.columns = [
      { width: 18 }, // A - Categoria/Descrição
      { width: 28 }, // B - Descrição
      { width: 12 }, // C - Tipo
      { width: 14 }, // D - Vencimento
      { width: 16 }, // E - Valor/Esperado
      { width: 16 }, // F - Pago/Recebido
      { width: 16 }, // G - Restante
    ]

    // Row 1: Title
    sheet.mergeCells("A1:G1")
    const titleCell = sheet.getCell("A1")
    titleCell.value = `PlanFin — ${monthName} ${plan.year}`
    titleCell.font = { size: 16, bold: true, color: { argb: COLORS.headerText } }
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } }
    titleCell.alignment = { horizontal: "center", vertical: "middle" }
    sheet.getRow(1).height = 32

    // Row 2: Initial balance
    sheet.mergeCells("A2:G2")
    const balanceCell = sheet.getCell("A2")
    balanceCell.value = `Saldo Inicial: ${formatCurrency(plan.initialBalance)}`
    balanceCell.font = { size: 11 }
    balanceCell.alignment = { horizontal: "center" }
    sheet.getRow(2).height = 22

    // Freeze rows 1-2
    sheet.views = [{ state: "frozen", ySplit: 2, xSplit: 0 }]

    let currentRow = 4
    let entryBalance = plan.initialBalance
    let realEntryBalance = plan.initialBalance

    for (let p = 1; p <= periodCount; p++) {
      const periodExpenses = plan.expenses.filter((e) => e.period === p)
      const periodIncomes = plan.incomes.filter((i) => i.period === p)
      const summary = calcPeriodSummary(entryBalance, periodExpenses, periodIncomes, realEntryBalance)
      const label = getPeriodLabel(plan.cutDays, p, daysInMonth)

      // Period header row
      sheet.mergeCells(`A${currentRow}:G${currentRow}`)
      const periodCell = sheet.getCell(`A${currentRow}`)
      periodCell.value = label
      periodCell.font = { bold: true, size: 12 }
      periodCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.periodBg } }
      periodCell.alignment = { vertical: "middle" }
      sheet.getRow(currentRow).height = 24
      currentRow += 2

      // --- RECEITAS ---
      if (periodIncomes.length > 0) {
        // Section title
        sheet.mergeCells(`A${currentRow}:G${currentRow}`)
        const incTitle = sheet.getCell(`A${currentRow}`)
        incTitle.value = "RECEITAS"
        incTitle.font = { bold: true, size: 10, color: { argb: COLORS.incomeText } }
        incTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.incomeHeaderBg } }
        currentRow++

        // Headers
        const incHeaderStart = currentRow
        currentRow = setRowValues(sheet, currentRow,
          ["Descrição", "Tipo", "Vencimento", "Esperado", "Recebido", null, null],
          { isHeader: true, fill: COLORS.incomeHeaderBg }
        )

        // Data rows
        periodIncomes.forEach((inc, idx) => {
          const fill = idx % 2 === 1 ? COLORS.zebra : undefined
          currentRow = setRowValues(sheet, currentRow,
            [
              inc.description,
              inc.isFixed ? "Fixa" : "Variável",
              inc.dueDate ? formatShortDate(inc.dueDate) : "-",
              inc.expectedAmount,
              inc.receivedAmount,
              null,
              null,
            ],
            { fill, isCurrency: [false, false, false, true, true, false, false] }
          )
        })

        // Total row
        const totalRow = sheet.getRow(currentRow)
        totalRow.getCell(1).value = "Total"
        totalRow.getCell(1).font = { bold: true }
        totalRow.getCell(4).value = summary.totalIncome
        totalRow.getCell(5).value = summary.totalReceived
        ;[1, 2, 3, 4, 5].forEach((col) => {
          const cell = totalRow.getCell(col)
          cell.font = { ...cell.font, bold: true }
          applyThinBorder(cell)
          cell.border = {
            ...cell.border,
            top: { style: "double", color: { argb: COLORS.border } },
          }
          if (col >= 4) applyCurrencyFormat(cell)
        })
        currentRow++

        // Auto-filter on income table
        sheet.autoFilter = {
          from: { row: incHeaderStart, column: 1 },
          to: { row: currentRow - 1, column: 5 },
        }

        currentRow++
      }

      // --- DESPESAS ---
      if (periodExpenses.length > 0) {
        // Section title
        sheet.mergeCells(`A${currentRow}:G${currentRow}`)
        const expTitle = sheet.getCell(`A${currentRow}`)
        expTitle.value = "DESPESAS"
        expTitle.font = { bold: true, size: 10, color: { argb: COLORS.expenseText } }
        expTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.expenseHeaderBg } }
        currentRow++

        // Headers
        const expHeaderStart = currentRow
        currentRow = setRowValues(sheet, currentRow,
          ["Categoria", "Descrição", "Tipo", "Vencimento", "Valor", "Pago", "Restante"],
          { isHeader: true, fill: COLORS.expenseHeaderBg }
        )

        // Data rows
        periodExpenses.forEach((exp, idx) => {
          const fill = idx % 2 === 1 ? COLORS.zebra : undefined
          const catColor = exp.category?.color || undefined
          currentRow = setRowValues(sheet, currentRow,
            [
              exp.category?.name || "-",
              exp.description,
              exp.isFixed ? "Fixa" : "Variável",
              exp.dueDate ? formatShortDate(exp.dueDate) : "-",
              exp.plannedAmount,
              exp.paidAmount,
              exp.plannedAmount - exp.paidAmount,
            ],
            { fill, isCurrency: [false, false, false, false, true, true, true], categoryColor: catColor }
          )
        })

        // Total row
        const totalRow = sheet.getRow(currentRow)
        totalRow.getCell(1).value = "Total"
        totalRow.getCell(5).value = summary.totalExpenses
        totalRow.getCell(6).value = summary.totalPaid
        totalRow.getCell(7).value = summary.totalRemaining
        ;[1, 2, 3, 4, 5, 6, 7].forEach((col) => {
          const cell = totalRow.getCell(col)
          cell.font = { ...cell.font, bold: true }
          applyThinBorder(cell)
          cell.border = {
            ...cell.border,
            top: { style: "double", color: { argb: COLORS.border } },
          }
          if (col >= 5) applyCurrencyFormat(cell)
        })
        currentRow++

        // Auto-filter on expense table
        sheet.autoFilter = {
          from: { row: expHeaderStart, column: 1 },
          to: { row: currentRow - 1, column: 7 },
        }

        currentRow++
      }

      // Period summary row
      sheet.mergeCells(`A${currentRow}:G${currentRow}`)
      const summaryCell = sheet.getCell(`A${currentRow}`)
      summaryCell.value = `Receitas: ${formatCurrency(summary.totalIncome)}  |  Despesas: ${formatCurrency(summary.totalExpenses)}  |  Saldo Projetado: ${formatCurrency(summary.balance)}  |  Saldo Real: ${formatCurrency(summary.realBalance)}`
      summaryCell.font = { bold: true, size: 10 }
      summaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.summaryBg } }
      currentRow += 2

      entryBalance = summary.balance
      realEntryBalance = summary.realBalance
    }

    // Month final summary
    const totalPlanned = plan.expenses.reduce((s, e) => s + e.plannedAmount, 0)
    const totalPaid = plan.expenses.reduce((s, e) => s + e.paidAmount, 0)
    const totalExpected = plan.incomes.reduce((s, i) => s + i.expectedAmount, 0)
    const totalReceived = plan.incomes.reduce((s, i) => s + i.receivedAmount, 0)

    sheet.mergeCells(`A${currentRow}:G${currentRow}`)
    const finalTitle = sheet.getCell(`A${currentRow}`)
    finalTitle.value = "RESUMO FINAL DO MÊS"
    finalTitle.font = { bold: true, size: 12, color: { argb: COLORS.headerText } }
    finalTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } }
    finalTitle.alignment = { horizontal: "center" }
    sheet.getRow(currentRow).height = 26
    currentRow++

    const summaryData = [
      ["Total Receitas", formatCurrency(totalExpected), "Total Despesas", formatCurrency(totalPlanned)],
      ["Receitas Recebidas", formatCurrency(totalReceived), "Despesas Pagas", formatCurrency(totalPaid)],
      ["Saldo Final Projetado", formatCurrency(entryBalance), "Saldo Final Real", formatCurrency(realEntryBalance)],
    ]

    for (const row of summaryData) {
      const r = sheet.getRow(currentRow)
      r.getCell(1).value = row[0]
      r.getCell(1).font = { bold: true }
      r.getCell(2).value = row[1]
      r.getCell(2).font = { bold: true }
      r.getCell(4).value = row[2]
      r.getCell(4).font = { bold: true }
      r.getCell(5).value = row[3]
      r.getCell(5).font = { bold: true }
      ;[1, 2, 3, 4, 5].forEach((col) => applyThinBorder(r.getCell(col)))
      currentRow++
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
