import type { LogEntry } from '../composables/useLogEntries'
import type { Note } from '../composables/useNotes'
import { tagLabel } from './noteTags'

const TABLE_TITLE = 'CUADRO DE REGISTRO DE ACTIVIDADES'

const HEADER_FECHA = 'Fecha ¿CUÁNDO?'
const HEADER_ACTIVIDAD = 'Actividad ¿QUÉ HICE?'
const HEADER_TEORIAS = 'Teorías ¿QUÉ TEORÍAS APRENDIDAS EN MIS ESTUDIOS APLIQUÉ?'
const HEADER_APRENDIZAJES =
  'Nuevos aprendizajes: conocimientos/ habilidades prácticas/ habilidades de manejo de emociones ¿QUÉ NUEVO CONOCIMIENTO O HABILIDAD APRENDÍ?'
const HEADER_IMPACTO = 'Impacto ¿QUÉ ME IMPRESIONÓ O IMPACTÓ?'
const HEADER_OTROS = 'Otros elementos a considerar'

const BITACORA_INTRO =
  'Una bitácora de trabajo, es un cuaderno o libreta de notas en el cual se registran las actividades que se realizan a diario, también sirve para anotar las tareas pendientes o para planificar las actividades a realizar en una jornada de trabajo.'

const BITACORA_OUTRO =
  'Si se te complica trabajar con un cuaderno, puedes utilizar el siguiente cuadro para llevar el registro de todas tus actividades, lo importante es tomar nota detallada de todo lo que hagas, de esta manera será mas fácil organizar y redactar cada uno de los momentos de tu informe escrito. Puedes ir agregando las filas que necesites para registrar tus actividades.'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function dateTimeValue(dateStr: string | null): number {
  if (!dateStr) return 0
  const time = new Date(dateStr).getTime()
  return isNaN(time) ? 0 : time
}

function cell(value: string | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|')
}

function dateRange(entry: LogEntry): string {
  if (!entry.datStart) return ''
  const start = formatDate(entry.datStart)
  const end = entry.datEnd ? formatDate(entry.datEnd) : ''
  return end && end !== start ? `${start} → ${end}` : start
}

function uniqueAreas(entries: LogEntry[]): string {
  const areas = [...new Set(entries.map((e) => e.area).filter((a): a is string => !!a && a.trim() !== ''))]
  return areas.join(', ')
}

function pushTable(lines: string[], rows: string[][]): void {
  lines.push(`| ${TABLE_TITLE} |  |  |  |  |  |`)
  lines.push('| ----- | ----- | ----- | ----- | ----- | ----- |')
  lines.push(
    `| **SEMANA # :** ${cell(rows[0]?.[0] ?? '')} |  |  | **ÁREA O DEPARTAMENTO:** ${cell(rows[0]?.[1] ?? '')} |  |  |`
  )
  lines.push(
    `| **${HEADER_FECHA}** | **${HEADER_ACTIVIDAD}** | **${HEADER_TEORIAS}** | **${HEADER_APRENDIZAJES}** | **${HEADER_IMPACTO}** | **${HEADER_OTROS}** |`
  )
  for (const row of rows.slice(1)) {
    lines.push(`| ${row.map(cell).join(' | ')} |`)
  }
  lines.push('')
}

export function buildMarkdown(logEntries: LogEntry[], notes: Note[]): string {
  const lines: string[] = ['# Bitácora', '']

  const today = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  lines.push(`_Generado el ${today}_`, '')

  const sortedEntries = [...logEntries].sort(
    (a, b) => dateTimeValue(a.datStart) - dateTimeValue(b.datStart)
  )

  const groups = new Map<number | null, LogEntry[]>()
  for (const entry of sortedEntries) {
    const key = entry.week ?? null
    const list = groups.get(key)
    if (list) list.push(entry)
    else groups.set(key, [entry])
  }

  const groupKeys = [...groups.keys()].sort((a, b) => {
    if (a === null) return 1
    if (b === null) return -1
    return a - b
  })

  for (const key of groupKeys) {
    const entries = groups.get(key)!
    const rows: string[][] = [[key === null ? '—' : String(key), uniqueAreas(entries)]]
    for (const entry of entries) {
      const learningNotes = notes
        .filter((n) => n.logEntryId === entry.id && n.tag === 'aprendizaje')
        .sort((a, b) => dateTimeValue(b.date) - dateTimeValue(a.date))
      const learnings = learningNotes
        .map((n) => (n.title ? `**${n.title}**<br>${n.content}` : n.content))
        .join('<br><br>')

      rows.push([
        dateRange(entry),
        entry.name,
        entry.theory ?? '',
        learnings,
        entry.impact ?? '',
        entry.resources ?? '',
      ])
    }
    pushTable(lines, rows)
  }

  const entryNameById = new Map<number, string>()
  for (const entry of logEntries) {
    entryNameById.set(entry.id, entry.name)
  }

  const otherNotes = notes
    .filter((n) => n.tag !== 'aprendizaje')
    .sort((a, b) => dateTimeValue(b.date) - dateTimeValue(a.date))

  lines.push('## NOTAS', '')

  if (otherNotes.length === 0) {
    lines.push('Sin notas.', '')
  } else {
    for (const note of otherNotes) {
      const activityName = note.logEntryId ? entryNameById.get(note.logEntryId) : null
      lines.push(
        `### ${activityName || 'Sin actividad'} — ${note.title || 'Sin título'}`,
        ''
      )
      if (note.date) lines.push(`- **Fecha:** ${formatDate(note.date)}`)
      lines.push(`- **Etiqueta:** ${tagLabel(note.tag)}`)
      lines.push('', note.content, '')
    }
  }

  lines.push('**BITÁCORA**', '', BITACORA_INTRO, '', BITACORA_OUTRO)

  return lines.join('\n').trim() + '\n'
}

export function downloadMarkdown(markdown: string, filename = 'bitacora.md'): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}