import type { LogEntry } from '../composables/useLogEntries'
import type { Note } from '../composables/useNotes'
import { tagLabel } from './noteTags'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Terminada',
}

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

function pushField(lines: string[], label: string, value: string | null | number | undefined): void {
  if (value !== null && value !== undefined && String(value).trim() !== '') {
    lines.push(`- **${label}:** ${value}`)
  }
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
    (a, b) => dateTimeValue(b.datStart) - dateTimeValue(a.datStart)
  )

  lines.push('## Actividades', '')

  for (const entry of sortedEntries) {
    lines.push(`### ${entry.name}`, '')

    if (entry.datStart) {
      const range = entry.datEnd
        ? `${formatDate(entry.datStart)} → ${formatDate(entry.datEnd)}`
        : formatDate(entry.datStart)
      lines.push(`- **Fecha:** ${range}`)
    }
    pushField(lines, 'Semana', entry.week)
    pushField(lines, 'Área', entry.area)
    lines.push(`- **Estado:** ${STATUS_LABELS[entry.status] || entry.status}`)
    lines.push(`- **¿Qué hice?** ${entry.name}`)
    pushField(lines, 'Teorías', entry.theory)
    pushField(lines, 'Impacto', entry.impact)
    pushField(lines, 'Otros elementos', entry.resources)

    const entryNotes = notes
      .filter((n) => n.logEntryId === entry.id)
      .sort((a, b) => dateTimeValue(b.date) - dateTimeValue(a.date))

    if (entryNotes.length > 0) {
      lines.push('', '**Notas:**')
      for (const note of entryNotes) {
        lines.push(`- **${note.title || 'Sin título'}**`)
        if (note.date) lines.push(`  - Fecha: ${formatDate(note.date)}`)
        lines.push(`  - Etiqueta: ${tagLabel(note.tag)}`)
        const content = note.content.split('\n').join('\n  ')
        lines.push(`  - ${content}`)
      }
    }

    lines.push('')
  }

  const standaloneNotes = notes
    .filter((n) => n.logEntryId === null)
    .sort((a, b) => dateTimeValue(b.date) - dateTimeValue(a.date))

  lines.push('## Notas', '')

  if (standaloneNotes.length === 0) {
    lines.push('Sin notas.')
  } else {
    for (const note of standaloneNotes) {
      lines.push(`### ${note.title || 'Sin título'}`, '')
      if (note.date) lines.push(`- **Fecha:** ${formatDate(note.date)}`)
      lines.push(`- **Etiqueta:** ${tagLabel(note.tag)}`)
      lines.push('', note.content, '')
    }
  }

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
