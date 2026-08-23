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
  pendingExpenseBg: "FFfef2f2",
  paidBg: "FFf1f5f9",
  pendingIncomeBg: "FFfffbeb",
  mutedText: "FF94a3b8",
  greenText: "FF10b981",
  redText: "FFef4444",
  indigoText: "FF4f46e5",
  amberText: "FFd97706",
  violetText: "FF7c3aed",
  emeraldText: "FF059669",
}

const LAST_COL = 9 // I
const LAST_COL_LETTER = "I"

function applyThinBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: COLORS.border } },
    bottom: { style: "thin", color: { argb: COLORS.border } },
    left: { style: "thin", color: { argb: COLORS.border } },
    right: { style: "thin", color: { argb: COLORS.border } },
  }
}

function applyCurrencyFormat(cell: ExcelJS.Cell) {
  cell.numFmt = 'R$ #,##0.00'
  cell.alignment = { horizontal: "right" }
}

// Excel Tables dão a cada tabela seus próprios dropdowns de filtro —
// sheet.autoFilter é um só por planilha e não serve para múltiplas tabelas.
function addFilterableTable(
  sheet: ExcelJS.Worksheet,
  name: string,
  headerRow: number,
  columnNames: string[],
  rows: (string | number | null)[][]
) {
  sheet.addTable({
    name,
    ref: `A${headerRow}`,
    headerRow: true,
    totalsRow: false,
    style: { theme: undefined, showRowStripes: false },
    columns: columnNames.map((n) => ({ name: n, filterButton: true })),
    rows,
  })
}

function styleHeaderRow(sheet: ExcelJS.Worksheet, rowNum: number, colCount: number, fill: string) {
  const row = sheet.getRow(rowNum)
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c)
    cell.font = { bold: true, color: { argb: "FF1e293b" }, size: 10 }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }
    applyThinBorder(cell)
  }
}

function styleTotalRow(sheet: ExcelJS.Worksheet, rowNum: number, colCount: number, currencyFrom: number) {
  const row = sheet.getRow(rowNum)
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c)
    cell.font = { ...cell.font, bold: true }
    applyThinBorder(cell)
    cell.border = {
      ...cell.border,
      top: { style: "double", color: { argb: COLORS.border } },
    }
    if (c >= currencyFrom) applyCurrencyFormat(cell)
  }
}

// Linha "Fixo: X + Variável: Y = Z" abaixo do total, como na tela
function addBreakdownRow(
  sheet: ExcelJS.Worksheet,
  rowNum: number,
  fixed: number,
  variable: number
) {
  sheet.mergeCells(`A${rowNum}:${LAST_COL_LETTER}${rowNum}`)
  const cell = sheet.getCell(`A${rowNum}`)
  cell.value = `Fixo: ${formatCurrency(fixed)}  +  Variável: ${formatCurrency(variable)}  =  ${formatCurrency(fixed + variable)}`
  cell.font = { size: 9, italic: true, color: { argb: COLORS.mutedText } }
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
      { width: 12 }, // D - Pgto. (despesas) / Esperado (receitas)
      { width: 16 }, // E - Vencimento (despesas) / Médio (receitas)
      { width: 16 }, // F - Valor (despesas) / Recebido (receitas)
      { width: 16 }, // G - Médio (despesas) / Restante (receitas)
      { width: 16 }, // H - Pago
      { width: 16 }, // I - Restante
    ]

    // Row 1: Title
    sheet.mergeCells(`A1:${LAST_COL_LETTER}1`)
    const titleCell = sheet.getCell("A1")
    titleCell.value = `PlanFin — ${monthName} ${plan.year}`
    titleCell.font = { size: 16, bold: true, color: { argb: COLORS.headerText } }
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } }
    titleCell.alignment = { horizontal: "center", vertical: "middle" }
    sheet.getRow(1).height = 32

    // Row 2: Initial balance
    sheet.mergeCells(`A2:${LAST_COL_LETTER}2`)
    const balanceCell = sheet.getCell("A2")
    balanceCell.value = `Período: ${getMonthName(plan.month)} ${plan.year}`
    balanceCell.font = { size: 11 }
    balanceCell.alignment = { horizontal: "center" }
    sheet.getRow(2).height = 22

    // Freeze rows 1-2
    sheet.views = [{ state: "frozen", ySplit: 2, xSplit: 0 }]

    let currentRow = 4
    let entryBalance = 0
    let realEntryBalance = 0

    for (let p = 1; p <= periodCount; p++) {
      const periodExpenses = plan.expenses.filter((e) => e.period === p)
      const periodIncomes = plan.incomes.filter((i) => i.period === p)
      const summary = calcPeriodSummary(entryBalance, periodExpenses, periodIncomes, realEntryBalance)
      const label = getPeriodLabel(plan.cutDays, p, daysInMonth)

      // Period header row
      sheet.mergeCells(`A${currentRow}:${LAST_COL_LETTER}${currentRow}`)
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
        sheet.mergeCells(`A${currentRow}:${LAST_COL_LETTER}${currentRow}`)
        const incTitle = sheet.getCell(`A${currentRow}`)
        incTitle.value = "RECEITAS"
        incTitle.font = { bold: true, size: 10, color: { argb: COLORS.incomeText } }
        incTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.incomeHeaderBg } }
        currentRow++

        const incHeaderRow = currentRow
        const incRows = periodIncomes.map((inc) => [
          inc.description,
          inc.isFixed ? "Fixa" : "Variável",
          inc.dueDate ? formatShortDate(inc.dueDate) : "-",
          inc.expectedAmount,
          inc.averageAmount ?? null,
          inc.receivedAmount,
        ])
        addFilterableTable(
          sheet,
          `Receitas_${plan.year}_${plan.month}_P${p}`,
          incHeaderRow,
          ["Descrição", "Tipo", "Vencimento", "Esperado", "Médio", "Recebido"],
          incRows
        )
        styleHeaderRow(sheet, incHeaderRow, 6, COLORS.incomeHeaderBg)

        // Data row styling
        periodIncomes.forEach((inc, idx) => {
          const rowNum = incHeaderRow + 1 + idx
          const isReceived = inc.receivedAmount >= inc.expectedAmount
          const fill = !isReceived ? COLORS.pendingIncomeBg : (idx % 2 === 1 ? COLORS.zebra : undefined)
          const row = sheet.getRow(rowNum)
          for (let c = 1; c <= 6; c++) {
            const cell = row.getCell(c)
            applyThinBorder(cell)
            if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }
            if (c >= 4) applyCurrencyFormat(cell)
            if (c === 5) cell.font = { ...cell.font, color: { argb: COLORS.mutedText } }
          }
        })
        currentRow = incHeaderRow + 1 + periodIncomes.length

        // Total row (fora da tabela, para não sumir ao filtrar)
        const incAverage = periodIncomes.reduce((s, i) => s + (i.averageAmount ?? 0), 0)
        const totalRow = sheet.getRow(currentRow)
        totalRow.getCell(1).value = "Total"
        totalRow.getCell(4).value = summary.totalIncome
        totalRow.getCell(5).value = incAverage
        totalRow.getCell(6).value = summary.totalReceived
        styleTotalRow(sheet, currentRow, 6, 4)
        totalRow.getCell(5).font = { bold: true, color: { argb: COLORS.mutedText } }
        currentRow++

        const incFixed = periodIncomes.reduce((s, i) => s + (i.isFixed ? i.expectedAmount : 0), 0)
        addBreakdownRow(sheet, currentRow, incFixed, summary.totalIncome - incFixed)
        currentRow += 2
      }

      // --- DESPESAS ---
      if (periodExpenses.length > 0) {
        // Section title
        sheet.mergeCells(`A${currentRow}:${LAST_COL_LETTER}${currentRow}`)
        const expTitle = sheet.getCell(`A${currentRow}`)
        expTitle.value = "DESPESAS"
        expTitle.font = { bold: true, size: 10, color: { argb: COLORS.expenseText } }
        expTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.expenseHeaderBg } }
        currentRow++

        const expHeaderRow = currentRow
        const expRows = periodExpenses.map((exp) => [
          exp.category?.name || "-",
          exp.description,
          exp.isFixed ? "Fixa" : "Variável",
          exp.paymentMethod === "CARD" ? "Cartão" : "Dinheiro",
          exp.dueDate ? formatShortDate(exp.dueDate) : "-",
          exp.plannedAmount,
          exp.averageAmount ?? null,
          exp.paidAmount,
          exp.plannedAmount - exp.paidAmount,
        ])
        addFilterableTable(
          sheet,
          `Despesas_${plan.year}_${plan.month}_P${p}`,
          expHeaderRow,
          ["Categoria", "Descrição", "Tipo", "Pgto.", "Vencimento", "Valor", "Médio", "Pago", "Restante"],
          expRows
        )
        styleHeaderRow(sheet, expHeaderRow, LAST_COL, COLORS.expenseHeaderBg)

        // Data row styling
        periodExpenses.forEach((exp, idx) => {
          const rowNum = expHeaderRow + 1 + idx
          const isPaid = exp.paidAmount >= exp.plannedAmount
          const fill = !isPaid ? COLORS.pendingExpenseBg : (idx % 2 === 1 ? COLORS.zebra : undefined)
          const row = sheet.getRow(rowNum)
          for (let c = 1; c <= LAST_COL; c++) {
            const cell = row.getCell(c)
            applyThinBorder(cell)
            if (fill) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } }
            if (c >= 6) applyCurrencyFormat(cell)
            if (c === 7) cell.font = { ...cell.font, color: { argb: COLORS.mutedText } }
            if (c === 4) cell.font = { ...cell.font, color: { argb: exp.paymentMethod === "CARD" ? COLORS.violetText : COLORS.emeraldText } }
          }
          if (exp.category?.color) {
            const catCell = row.getCell(1)
            catCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${exp.category.color.replace("#", "")}` } }
            catCell.font = { ...catCell.font, color: { argb: "FFFFFFFF" }, bold: true }
          }
        })
        currentRow = expHeaderRow + 1 + periodExpenses.length

        // Total row (fora da tabela, para não sumir ao filtrar)
        const expAverage = periodExpenses.reduce((s, e) => s + (e.averageAmount ?? 0), 0)
        const totalRow = sheet.getRow(currentRow)
        totalRow.getCell(1).value = "Total"
        totalRow.getCell(6).value = summary.totalExpenses
        totalRow.getCell(7).value = expAverage
        totalRow.getCell(8).value = summary.totalPaid
        totalRow.getCell(9).value = summary.totalRemaining
        styleTotalRow(sheet, currentRow, LAST_COL, 6)
        totalRow.getCell(7).font = { bold: true, color: { argb: COLORS.mutedText } }
        currentRow++

        const expFixed = periodExpenses.reduce((s, e) => s + (e.isFixed ? e.plannedAmount : 0), 0)
        addBreakdownRow(sheet, currentRow, expFixed, summary.totalExpenses - expFixed)
        currentRow++
        const expCard = periodExpenses.reduce((s, e) => s + (e.paymentMethod === "CARD" ? e.plannedAmount : 0), 0)
        sheet.mergeCells(`A${currentRow}:${LAST_COL_LETTER}${currentRow}`)
        const payCell = sheet.getCell(`A${currentRow}`)
        payCell.value = `Dinheiro: ${formatCurrency(summary.totalExpenses - expCard)}  |  Cartão: ${formatCurrency(expCard)}`
        payCell.font = { size: 9, italic: true, color: { argb: COLORS.mutedText } }
        currentRow += 2
      }

      // Period summary row
      sheet.mergeCells(`A${currentRow}:${LAST_COL_LETTER}${currentRow}`)
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
    const expenseFixed = plan.expenses.reduce((s, e) => s + (e.isFixed ? e.plannedAmount : 0), 0)
    const expenseAverage = plan.expenses.reduce((s, e) => s + (e.averageAmount ?? 0), 0)
    const expenseCard = plan.expenses.reduce((s, e) => s + (e.paymentMethod === "CARD" ? e.plannedAmount : 0), 0)
    const totalExpected = plan.incomes.reduce((s, i) => s + i.expectedAmount, 0)
    const totalReceived = plan.incomes.reduce((s, i) => s + i.receivedAmount, 0)
    const incomeFixed = plan.incomes.reduce((s, i) => s + (i.isFixed ? i.expectedAmount : 0), 0)
    const incomeAverage = plan.incomes.reduce((s, i) => s + (i.averageAmount ?? 0), 0)

    sheet.mergeCells(`A${currentRow}:${LAST_COL_LETTER}${currentRow}`)
    const finalTitle = sheet.getCell(`A${currentRow}`)
    finalTitle.value = "RESUMO FINAL DO MÊS"
    finalTitle.font = { bold: true, size: 12, color: { argb: COLORS.headerText } }
    finalTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg } }
    finalTitle.alignment = { horizontal: "center" }
    sheet.getRow(currentRow).height = 26
    currentRow++

    const summaryData = [
      ["Total Receitas", formatCurrency(totalExpected), "Total Despesas", formatCurrency(totalPlanned)],
      ["Receitas Fixas", formatCurrency(incomeFixed), "Despesas Fixas", formatCurrency(expenseFixed)],
      ["Receitas Variáveis", formatCurrency(totalExpected - incomeFixed), "Despesas Variáveis", formatCurrency(totalPlanned - expenseFixed)],
      ["Médio Receitas", formatCurrency(incomeAverage), "Médio Despesas", formatCurrency(expenseAverage)],
      ["", "", "Despesas em Dinheiro", formatCurrency(totalPlanned - expenseCard)],
      ["", "", "Despesas no Cartão", formatCurrency(expenseCard)],
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
