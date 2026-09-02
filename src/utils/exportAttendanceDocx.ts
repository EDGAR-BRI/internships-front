import JSZip from 'jszip'
import type { Attendance, AttendanceSummary } from '../composables/useAttendances'
import type { UserSettings } from '../composables/useSettings'
import { computeWeek } from './week'

const TEMPLATE_URL = '/asistencias.docx'
const FILENAME = 'control-asistencia.docx'
const BLOCKS_PER_SHEET = 3
const ROWS_PER_BLOCK = 5
const HOURS_PER_DAY = 8
const TARGET_DAYS = 45

export type AttendanceExportMode = 'standard' | 'complete' | 'days8'

interface ExportDay extends Attendance {
  synthetic?: boolean
}

const FILLED_PARA = (value: string) =>
  `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r></w:p>`

const EMPTY_PARA = '<w:p/>'

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatDateShort(iso: string): string {
  const parts = iso.slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return iso
  const [y, m, d] = parts
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function formatTime12(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Mexico_City',
  }).formatToParts(d)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? ''
  const minute = parts.find((p) => p.type === 'minute')?.value ?? ''
  const period = parts.find((p) => p.type === 'dayPeriod')?.value ?? ''
  const periodShort = period.includes('p') ? 'pm' : 'am'
  return `${hour}:${minute} ${periodShort}`
}

function formatClockTime(value: string | null | undefined): string {
  if (!value) return ''
  const m = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return formatTime12(value)
  const hour = Number(m[1])
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const period = hour < 12 ? 'am' : 'pm'
  return `${hour12}:${m[2]} ${period}`
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

function isCountableDay(
  dateStr: string,
  daysPerWeek: number,
  skippedWeeks: number[],
  startDate: string | null
): boolean {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  const dayIndex = (new Date(y, m - 1, d).getDay() + 6) % 7
  if (dayIndex >= daysPerWeek) return false
  if (startDate && skippedWeeks.length > 0) {
    const rawWeek = computeWeek(startDate, dateStr, [])
    if (rawWeek !== null && skippedWeeks.includes(rawWeek)) return false
  }
  return true
}

interface SheetWeek {
  week: number
  days: ExportDay[]
}

function buildDataRow(
  templateRow: string,
  opts: {
    merge: 'restart' | 'continue' | 'none'
    week: string
    date: string
    checkIn: string
    morningEnd: string
    afternoonStart: string
    checkOut: string
  }
): string {
  const cells = templateRow.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []
  if (cells.length !== 10) return templateRow

  const prefix = templateRow.slice(0, templateRow.indexOf(cells[0])).replace(/<w:tr[^>]*>/, '<w:tr>')
  const last = cells[cells.length - 1]
  const suffix = templateRow.slice(templateRow.lastIndexOf(last) + last.length)

  const cell0 = cells[0]
    .replace(
      /<w:vMerge[^/]*\/>/,
      opts.merge === 'restart'
        ? '<w:vMerge w:val="restart"/><w:vAlign w:val="center"/>'
        : opts.merge === 'continue'
          ? '<w:vMerge/>'
          : ''
    )
    .replace(/<w:p[^>]*\/>/, opts.merge === 'restart' ? FILLED_PARA(opts.week) : EMPTY_PARA)

  const fillMap: Record<number, string> = {
    1: opts.date,
    2: opts.checkIn,
    4: opts.morningEnd,
    6: opts.afternoonStart,
    8: opts.checkOut,
  }
  const rest = cells.slice(1).map((c, i) => {
    const value = fillMap[i + 1]
    return c.replace(/<w:p[^>]*\/>/, value ? FILLED_PARA(value) : EMPTY_PARA)
  })

  return prefix + [cell0, ...rest].join('') + suffix
}

function fillTotalCell(totalRow: string, lines: string[]): string {
  const cells = totalRow.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []
  if (cells.length !== 2) return totalRow
  const prefix = totalRow.slice(0, totalRow.indexOf(cells[0]))
  const suffix = totalRow.slice(totalRow.lastIndexOf(cells[1]) + cells[1].length)
  const runs = lines
    .map(
      (line, i) =>
        `<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>${
          i < lines.length - 1
            ? '<w:r><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:br/></w:r>'
            : ''
        }`
    )
    .join('')
  const filled = cells[1].replace(
    /<w:p[^>]*\/>/,
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${runs}</w:p>`
  )
  return prefix + cells[0] + filled + suffix
}

function buildSheet(
  tableXml: string,
  weeks: SheetWeek[],
  opts: {
    workStartTime: string | null
    workEndTime: string | null
    workMorningEndTime: string | null
    workAfternoonStartTime: string | null
    showDayHours: boolean
    totalLines: string[] | null
  }
): string {
  const rows = tableXml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? []
  if (rows.length < 18) return tableXml

  const tblPr = tableXml.match(/<w:tblPr>[\s\S]*?<\/w:tblPr>/)?.[0] ?? ''
  const tblGrid = tableXml.match(/<w:tblGrid>[\s\S]*?<\/w:tblGrid>/)?.[0] ?? ''
  const headerRows = rows.slice(0, 2).join('')
  let totalRow = rows[rows.length - 1]
  const dataTemplate = rows[2]

  const dataRows: string[] = []
  for (let b = 0; b < BLOCKS_PER_SHEET; b++) {
    const week = weeks[b]
    const dayCount = week ? week.days.length : 0
    const blockRows = Math.max(ROWS_PER_BLOCK, dayCount)
    for (let r = 0; r < blockRows; r++) {
      const day = week ? week.days[r] ?? null : null
      const synthetic = !!day?.synthetic
      const fullDay = !!day?.isFullDay
      const checkIn = day && !synthetic
        ? fullDay
          ? formatClockTime(opts.workStartTime)
          : formatClockTime(day.checkIn) || formatClockTime(opts.workStartTime)
        : ''
      const morningEnd = day && !synthetic ? formatClockTime(opts.workMorningEndTime) : ''
      const afternoonStart = day && !synthetic ? formatClockTime(opts.workAfternoonStartTime) : ''
      const checkOut = day && !synthetic
        ? fullDay
          ? formatClockTime(opts.workEndTime)
          : formatClockTime(day.checkOut) || formatClockTime(opts.workEndTime)
        : ''
      const dateLabel = day
        ? formatDateShort(day.date) +
          (opts.showDayHours && !synthetic && day.hours > 0 && day.hours !== HOURS_PER_DAY
            ? ` (${day.hours}h)`
            : '')
        : ''
      dataRows.push(
        buildDataRow(dataTemplate, {
          merge: week ? (r === 0 ? 'restart' : 'continue') : 'none',
          week: r === 0 && week ? String(week.week) : '',
          date: dateLabel,
          checkIn,
          morningEnd,
          afternoonStart,
          checkOut,
        })
      )
    }
  }

  if (opts.totalLines && opts.totalLines.length > 0) {
    totalRow = fillTotalCell(totalRow, opts.totalLines)
  }

  return `<w:tbl>${tblPr}${tblGrid}${headerRows}${dataRows.join('')}${totalRow}</w:tbl>`
}

function buildStandardWeeks(attendances: Attendance[], settings: UserSettings | null): SheetWeek[] {
  const sorted = [...attendances].sort((a, b) => a.date.localeCompare(b.date))
  const weekMap = new Map<number, ExportDay[]>()
  for (const attendance of sorted) {
    const week = settings?.startDate
      ? computeWeek(settings.startDate.slice(0, 10), attendance.date, settings.skippedWeeks)
      : null
    if (week === null || week === undefined) continue
    const list = weekMap.get(week) ?? []
    list.push(attendance)
    weekMap.set(week, list)
  }
  return [...weekMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, days]) => ({ week, days }))
}

function buildDays8Weeks(attendances: Attendance[], settings: UserSettings | null): SheetWeek[] {
  const sorted = [...attendances]
    .filter((a) => a.hours > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  const realDays: ExportDay[] = sorted.map((a) => ({ ...a, synthetic: false }))

  const startDate = settings?.startDate ? settings.startDate.slice(0, 10) : null
  const daysPerWeek = settings?.daysPerWeek ?? 5
  const skippedWeeks = settings?.skippedWeeks ?? []
  const lastRealDate = realDays.length > 0 ? realDays[realDays.length - 1].date.slice(0, 10) : null

  let cursor = lastRealDate ? addDays(lastRealDate, 1) : startDate ?? addDays(new Date().toISOString(), 1)
  let attempts = 0
  while (realDays.length < TARGET_DAYS && attempts < 10000) {
    if (isCountableDay(cursor, daysPerWeek, skippedWeeks, startDate)) {
      realDays.push({
        id: -realDays.length,
        userId: 0,
        date: cursor,
        checkIn: null,
        checkOut: null,
        isFullDay: false,
        hours: 0,
        mode: null,
        createdAt: '',
        updatedAt: '',
        synthetic: true,
      })
    }
    cursor = addDays(cursor, 1)
    attempts++
  }

  const weekMap = new Map<number, ExportDay[]>()
  for (const day of realDays) {
    const week = startDate ? computeWeek(startDate, day.date, skippedWeeks) : null
    if (week === null || week === undefined) continue
    const list = weekMap.get(week) ?? []
    list.push(day)
    weekMap.set(week, list)
  }
  if (weekMap.size === 0) {
    const groups = new Map<number, ExportDay[]>()
    realDays.forEach((day, i) => {
      const week = Math.floor(i / daysPerWeek) + 1
      const list = groups.get(week) ?? []
      list.push(day)
      groups.set(week, list)
    })
    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, days]) => ({ week, days }))
  }
  return [...weekMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, days]) => ({ week, days }))
}

export interface AttendanceExportData {
  fullName: string | null
  settings: UserSettings | null
  attendances: Attendance[]
  summary: AttendanceSummary | null
}

export async function generateAttendanceDocx(
  templateBuffer: ArrayBuffer,
  data: AttendanceExportData,
  mode: AttendanceExportMode = 'standard'
): Promise<Blob> {
  const zip = await JSZip.loadAsync(templateBuffer)
  const docFile = zip.file('word/document.xml')
  if (!docFile) throw new Error('Plantilla de asistencia inválida')
  let xml = await docFile.async('string')

  const fullName = (data.fullName || '').trim()
  const ci = (data.settings?.ci || '').trim()
  xml = xml.replace(
    '>NOMBRE DEL PASANTE: </w:t>',
    `>NOMBRE DEL PASANTE: ${escapeXml(fullName)} </w:t>`
  )
  xml = xml.replace('>C.I:</w:t>', `>C.I: ${escapeXml(ci)}</w:t>`)

  const tutorName = (data.settings?.tutorName || '').trim()
  const TUTOR_PARA = (name: string) =>
    `<w:p><w:pPr><w:tabs><w:tab w:val="center" w:pos="2428"/></w:tabs><w:rPr><w:b/></w:rPr></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:tab/><w:t>${escapeXml(name)}</w:t></w:r></w:p>`

  const RAYA = '____________________________'
  const SIGN_TABS = '<w:tabs><w:tab w:val="center" w:pos="2428"/><w:tab w:val="center" w:pos="7285"/><w:tab w:val="center" w:pos="12142"/></w:tabs>'
  const SIGN_RAYAS = `<w:p><w:pPr>${SIGN_TABS}</w:pPr><w:r><w:tab/><w:t>${RAYA}</w:t></w:r><w:r><w:tab/><w:t>${RAYA}</w:t></w:r><w:r><w:tab/><w:t>${RAYA}</w:t></w:r></w:p>`
  const SIGN_LABELS = `<w:p><w:pPr>${SIGN_TABS}</w:pPr><w:r><w:tab/><w:t>Nombre del Tutor Empresarial</w:t></w:r><w:r><w:tab/><w:t>Firma del Tutor Empresarial</w:t></w:r><w:r><w:tab/><w:t>Sello de la Empresa</w:t></w:r></w:p>`

  const paraWith = (needle: string) =>
    new RegExp(`<w:p[ >](?:(?!<\\/w:p>)[\\s\\S])*?${needle}(?:(?!<\\/w:p>)[\\s\\S])*?<\\/w:p>`)

  const alignFooterTail = (tail: string) =>
    tail
      .replace(paraWith(RAYA), SIGN_RAYAS)
      .replace(paraWith('Nombre del Tutor Empresarial'), SIGN_LABELS)

  const weeks =
    mode === 'days8'
      ? buildDays8Weeks(data.attendances, data.settings)
      : buildStandardWeeks(
          mode === 'complete'
            ? data.attendances.filter((a) => a.hours > 0)
            : data.attendances,
          data.settings
        )

  const tableXml = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/)?.[0]
  if (!tableXml) throw new Error('Plantilla de asistencia inválida')

  const headerPart = xml.slice(0, xml.indexOf(tableXml))
  const headerBlock = headerPart
    .replace(/^<\?xml[^>]*\?>/, '')
    .replace(/<w:document[^>]*>/, '')
    .replace(/<w:body>/, '')
  const tailPart = xml.slice(xml.lastIndexOf('</w:tbl>') + '</w:tbl>'.length)
  const alignedTail = alignFooterTail(tailPart)
  const withTutor = tutorName
    ? alignedTail.replace(
        /([\s\S]*)(<w:p[ >][\s\S]*?____________________________[\s\S]*?<\/w:p>)/,
        (_, before, underline) => before + TUTOR_PARA(tutorName) + underline
      )
    : alignedTail
  const footerClean = withTutor
    .replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/, '')
    .replace(/<\/w:body>\s*<\/w:document>/, '')
  const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
  const finalTail = withTutor
  const sheetOpts = {
    workStartTime: data.settings?.workStartTime ?? null,
    workEndTime: data.settings?.workEndTime ?? null,
    workMorningEndTime: data.settings?.workMorningEndTime ?? null,
    workAfternoonStartTime: data.settings?.workAfternoonStartTime ?? null,
    showDayHours: mode === 'complete',
    totalLines: null,
  }

  const sheetGroups: SheetWeek[][] = []
  for (let i = 0; i < weeks.length; i += BLOCKS_PER_SHEET) {
    sheetGroups.push(weeks.slice(i, i + BLOCKS_PER_SHEET))
  }
  if (sheetGroups.length === 0) sheetGroups.push([])

  let cumulativeDays = 0
  let cumulativeHours = 0
  let body = headerPart
  for (let i = 0; i < sheetGroups.length; i++) {
    if (i > 0) body += headerBlock
    const daysInGroup = sheetGroups[i].reduce((sum, w) => sum + w.days.length, 0)
    cumulativeDays += daysInGroup
    cumulativeHours += sheetGroups[i].reduce(
      (sum, w) => sum + w.days.reduce((s, d) => s + (d.synthetic ? 0 : d.hours), 0),
      0
    )
    let sheetTotal: string[] | null = null
    if (mode === 'complete') {
      sheetTotal = [`${cumulativeDays} días`, `${Math.round(cumulativeHours * 10) / 10}h`]
    } else if (mode === 'days8') {
      const days = Math.min(cumulativeDays, TARGET_DAYS)
      sheetTotal = [`${days} días`, `${days * HOURS_PER_DAY}h`]
    }
    body += buildSheet(tableXml, sheetGroups[i], { ...sheetOpts, totalLines: sheetTotal })
    body += i < sheetGroups.length - 1 ? footerClean + pageBreak : finalTail
  }

  zip.file('word/document.xml', body)
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

export async function buildAttendanceDocx(
  data: AttendanceExportData,
  mode: AttendanceExportMode = 'standard'
): Promise<Blob> {
  const res = await fetch(TEMPLATE_URL)
  if (!res.ok) throw new Error('No se pudo cargar la plantilla de asistencia')
  return generateAttendanceDocx(await res.arrayBuffer(), data, mode)
}

export function downloadDocx(blob: Blob, filename = FILENAME): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}