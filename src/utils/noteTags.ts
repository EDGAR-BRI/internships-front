export const NOTE_TAGS = [
  { value: 'general', label: 'General' },
  { value: 'aprendizaje', label: 'Aprendizaje' },
  { value: 'sentimientos', label: 'Sentimientos' },
  { value: 'idea', label: 'Idea' },
] as const

export type NoteTag = (typeof NOTE_TAGS)[number]['value']

export const NOTE_TAG_VALUES: string[] = NOTE_TAGS.map((t) => t.value)

export function tagLabel(value: string | null | undefined): string {
  const tag = NOTE_TAGS.find((t) => t.value === value)
  return tag?.label ?? 'General'
}

export function tagClasses(value: string | null | undefined): string {
  switch (value) {
    case 'aprendizaje':
      return 'bg-accent/10 text-accent border-accent/20'
    case 'sentimientos':
      return 'bg-warning/10 text-warning border-warning/20'
    case 'idea':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    default:
      return 'bg-overlay text-text-secondary border-border'
  }
}
