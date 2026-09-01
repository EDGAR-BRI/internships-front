import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import type { Attendance, AttendanceSummary } from '../composables/useAttendances'
import type { UserSettings } from '../composables/useSettings'
import { computeWeek } from './week'

const PAGE_WIDTH_DXA = 10800
const DATE_COL = 1400
const TIME_COL = Math.floor((PAGE_WIDTH_DXA - DATE_COL) / 8)

const BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '000000',
}

function borders() {
  return {
    top: BORDER,
    bottom: BORDER,
    left: BORDER,
    right: BORDER,
    insideHorizontal: BORDER,
    insideVertical: BORDER,
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Mexico_City',
  })
}

function formatDateShort(iso: string): string {
  const parts = iso.slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return iso
  const [y, m, d] = parts
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function cell(
  children: Paragraph[],
  opts: { width?: number; span?: number } = {}
): TableCell {
  return new TableCell({
    children,
    width: { size: opts.width ?? TIME_COL, type: WidthType.DXA },
    columnSpan: opts.span,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
  })
}

function emptyCell(width?: number, span?: number): TableCell {
  return cell([new Paragraph({ children: [] })], { width, span })
}

function textCell(text: string, opts: { bold?: boolean; center?: boolean } = {}): TableCell {
  const run = new TextRun({ text, bold: opts.bold })
  const paragraph = new Paragraph({
    children: [run],
    alignment: opts.center === false ? AlignmentType.LEFT : AlignmentType.CENTER,
  })
  return cell([paragraph])
}

function headerRow(colspan: number, label: string, width: number): TableRow {
  return new TableRow({
    children: [
      emptyCell(DATE_COL),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: colspan,
        width: { size: width, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      }),
      new TableCell({
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'TARDE', bold: true })],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: 4,
        width: { size: width, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      }),
    ],
  })
}

function subHeaderRow(): TableRow {
  const sub = ['HORA DE ENTRADA', 'FIRMA', 'HORA DE SALIDA', 'FIRMA']
  const cells: TableCell[] = [emptyCell(DATE_COL)]
  for (const label of sub) {
    cells.push(textCell(label, { bold: true, center: true }))
  }
  for (const label of sub) {
    cells.push(textCell(label, { bold: true, center: true }))
  }
  return new TableRow({ children: cells })
}

function dataRow(weekLabel: string, date: string, checkIn: string | null, checkOut: string | null): TableRow {
  const dateCell = cell([
    new Paragraph({
      children: [new TextRun({ text: weekLabel, bold: true })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: date })],
      alignment: AlignmentType.CENTER,
    }),
  ], { width: DATE_COL })

  const cells: TableCell[] = [dateCell]
  for (let i = 0; i < 8; i++) {
    let value = ''
    if (i === 0) value = formatTime(checkIn)
    if (i === 2) value = formatTime(checkOut)
    cells.push(textCell(value, { center: true }))
  }
  return new TableRow({ children: cells })
}

function totalRow(totalDays: number): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'TOTAL DÍAS ACUMULADOS: ', bold: true }),
              new TextRun({ text: `${totalDays}`, bold: true }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        columnSpan: 9,
        width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
      }),
    ],
  })
}

export interface AttendanceExportData {
  fullName: string | null
  settings: UserSettings | null
  attendances: Attendance[]
  summary: AttendanceSummary | null
}

export async function buildAttendanceDocx(data: AttendanceExportData): Promise<Blob> {
  const { fullName, settings, attendances, summary } = data
  const ci = settings?.ci?.trim() || ''

  const sorted = [...attendances].sort((a, b) => a.date.localeCompare(b.date))
  const rows = sorted.map((a) => {
    const week = settings?.startDate
      ? computeWeek(settings.startDate.slice(0, 10), a.date, settings.skippedWeeks)
      : null
    const weekLabel = week !== null && week !== undefined ? `Semana ${week}` : ''
    return dataRow(weekLabel, formatDateShort(a.date), a.checkIn, a.checkOut)
  })

  const totalDays = summary?.completedDays ?? sorted.length

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      children: [new TextRun({ text: 'CONTROL DE ASISTENCIA', bold: true, underline: {}, size: 32 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      tabStops: [{ type: TabStopType.LEFT, position: 6000 }],
      children: [
        new TextRun({ text: 'NOMBRE DEL PASANTE:  ', bold: true }),
        new TextRun({ text: fullName || '' }),
        new TextRun({ text: '\tC.I: ', bold: true }),
        new TextRun({ text: ci }),
      ],
      spacing: { after: 160 },
    }),
    new Table({
      rows: [
        headerRow(4, 'MAÑANA', PAGE_WIDTH_DXA - DATE_COL),
        subHeaderRow(),
        ...rows,
        totalRow(totalDays),
      ],
      width: { size: PAGE_WIDTH_DXA, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      borders: borders(),
    }),
    new Paragraph({ children: [], spacing: { before: 200, after: 120 } }),
    new Paragraph({
      children: [new TextRun({ text: 'Observaciones:', bold: true })],
      spacing: { after: 80 },
    }),
    new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 240 } }),
    new Paragraph({
      tabStops: [
        { type: TabStopType.LEFT, position: 2200 },
        { type: TabStopType.LEFT, position: 5500 },
        { type: TabStopType.LEFT, position: 8800 },
      ],
      children: [
        new TextRun({ text: '____________________________', underline: {} }),
        new TextRun({ text: '\t____________________________' }),
        new TextRun({ text: '\t____________________________' }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      tabStops: [
        { type: TabStopType.LEFT, position: 2200 },
        { type: TabStopType.LEFT, position: 5500 },
        { type: TabStopType.LEFT, position: 8800 },
      ],
      children: [
        new TextRun({ text: 'Nombre del Tutor Empresarial' }),
        new TextRun({ text: '\tFirma del Tutor Empresarial' }),
        new TextRun({ text: '\tSello de la Empresa' }),
      ],
    }),
  ]

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBlob(doc)
}

export function downloadDocx(blob: Blob, filename = 'control-asistencia.docx'): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
