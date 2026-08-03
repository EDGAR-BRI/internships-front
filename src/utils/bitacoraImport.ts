import { downloadMarkdown } from './exportMarkdown'

export interface ParsedNote {
  title: string | null
  content: string
  date: string | null
}

export interface ParsedLogEntry {
  name: string
  status: 'pending' | 'in_progress' | 'done'
  week: number | null
  area: string | null
  theory: string | null
  attitudes: string | null
  impact: string | null
  resources: string | null
  datStart: string | null
  datEnd: string | null
  notes: ParsedNote[]
}

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

const STATUS_MAP: Record<string, 'pending' | 'in_progress' | 'done'> = {
  pendiente: 'pending',
  'en curso': 'in_progress',
  terminada: 'done',
  terminado: 'done',
  pending: 'pending',
  in_progress: 'in_progress',
  done: 'done',
}

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
}

function parseDateEs(input: string): string | null {
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return iso[0]

  const m = input.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})/i)
  if (!m) return null
  const month = MONTHS[normalizeKey(m[2])]
  if (!month) return null
  const day = Number(m[1])
  if (day < 1 || day > 31) return null
  return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseDateRange(input: string): { start: string | null; end: string | null } {
  if (input.includes('→')) {
    const [a, b] = input.split('→').map((s) => s.trim())
    return { start: parseDateEs(a), end: parseDateEs(b) }
  }
  return { start: parseDateEs(input), end: null }
}

function applyField(activity: ParsedLogEntry, label: string, value: string) {
  const key = normalizeKey(label)
  const v = value.trim()

  switch (key) {
    case 'fecha': {
      const range = parseDateRange(v)
      activity.datStart = range.start
      activity.datEnd = range.end
      break
    }
    case 'semana': {
      const n = Number(v)
      if (!isNaN(n) && n > 0) activity.week = n
      break
    }
    case 'area':
      if (v) activity.area = v
      break
    case 'estado': {
      const st = STATUS_MAP[normalizeKey(v)]
      if (st) activity.status = st
      break
    }
    case 'que hice':
      if (v) activity.name = v
      break
    case 'teorias':
      if (v) activity.theory = v
      break
    case 'nuevos aprendizajes':
      if (v) activity.attitudes = v
      break
    case 'impacto':
      if (v) activity.impact = v
      break
    case 'otros elementos':
      if (v) activity.resources = v
      break
  }
}

export function parseBitacoraMarkdown(md: string): {
  logEntries: ParsedLogEntry[]
  notes: ParsedNote[]
} {
  const logEntries: ParsedLogEntry[] = []
  const notes: ParsedNote[] = []

  let section: 'activities' | 'notes' | null = null
  let activity: ParsedLogEntry | null = null
  let currentNote: ParsedNote | null = null
  let inActivityNotes = false

  const pushNoteContent = (line: string, stripPrefix: boolean) => {
    if (!currentNote) return
    const text = stripPrefix ? line.replace(/^-\s+/, '') : line
    currentNote.content = currentNote.content ? `${currentNote.content}\n${text}` : text
  }

  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('### ')) {
      const title = line.slice(4).trim()
      if (section === 'activities') {
        activity = {
          name: title,
          status: 'pending',
          week: null,
          area: null,
          theory: null,
          attitudes: null,
          impact: null,
          resources: null,
          datStart: null,
          datEnd: null,
          notes: [],
        }
        logEntries.push(activity)
        currentNote = null
        inActivityNotes = false
      } else {
        currentNote = { title: title || null, content: '', date: null }
        if (section === 'notes') notes.push(currentNote)
      }
      continue
    }

    if (line.startsWith('## ')) {
      const name = normalizeKey(line.slice(3))
      section = name === 'actividades' ? 'activities' : name === 'notas' ? 'notes' : null
      activity = null
      currentNote = null
      inActivityNotes = false
      continue
    }

    if (section === 'activities' && activity) {
      if (line === '**Notas:**') {
        inActivityNotes = true
        currentNote = null
        continue
      }

      if (inActivityNotes) {
        const titleMatch = line.match(/^-\s+\*\*(.+?)\*\*$/)
        if (titleMatch) {
          currentNote = { title: titleMatch[1].trim() || null, content: '', date: null }
          activity.notes.push(currentNote)
          continue
        }

        const fechaMatch = line.match(/^-\s*\*?\*?fecha\*?\*?:\s*(.+)$/i)
        if (fechaMatch && currentNote) {
          currentNote.date = parseDateEs(fechaMatch[1])
          continue
        }

        if (currentNote) {
          pushNoteContent(line, true)
        }
        continue
      }

      const fieldMatch = line.match(/^-\s*\*\*(.+?)\*\*(?::\s*|\s+)(.*)$/)
      if (fieldMatch) {
        applyField(activity, fieldMatch[1], fieldMatch[2])
      }
      continue
    }

    if (section === 'notes' && currentNote) {
      const fechaMatch = line.match(/^-\s*\*?\*?fecha\*?\*?:\s*(.+)$/i)
      if (fechaMatch) {
        currentNote.date = parseDateEs(fechaMatch[1])
        continue
      }
      if (normalizeKey(line) === 'sin notas') continue
      pushNoteContent(line, false)
    }
  }

  return { logEntries, notes }
}

export function buildTemplateMarkdown(): string {
  return `# Bitácora

Llena esta plantilla con tus actividades y notas, luego impórtala. Mantén el formato de los encabezados y campos para que se reconozcan.

## Actividades

### Configuración del entorno

- **Fecha:** 6 de julio de 2026 → 6 de julio de 2026
- **Semana:** 1
- **Área:** Backend
- **Estado:** Terminada
- **¿Qué hice?** Configuración del entorno
- **Teorías:** Teorías aplicadas y sus autores
- **Nuevos aprendizajes:** Lo que aprendiste
- **Impacto:** Qué te impactó
- **Otros elementos:** Notas adicionales

**Notas:**
- **Título de la nota**
  - Fecha: 6 de julio de 2026
  - Contenido de la nota vinculada a la actividad

## Notas

### Título de la nota del día

- **Fecha:** 6 de julio de 2026

Contenido de la nota del día, sin actividad.
`
}

export function downloadTemplateMarkdown(): void {
  downloadMarkdown(buildTemplateMarkdown(), 'plantilla-bitacora.md')
}
