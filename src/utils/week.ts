function parseDate(dateStr: string): Date {
  const parts = dateStr.slice(0, 10).split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) {
    return new Date(dateStr)
  }
  const [y, m, d] = parts
  return new Date(y, m - 1, d)
}

function mondayOf(dateStr: string): Date {
  const d = parseDate(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function computeWeek(
  startDate: string,
  date: string,
  skippedWeeks?: number[] | null
): number | null {
  if (!startDate || !date) return null

  const startMonday = mondayOf(startDate)
  const dateMonday = mondayOf(date)

  const diffMs = dateMonday.getTime() - startMonday.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  let week = Math.floor(diffDays / 7) + 1

  if (week < 1) return null

  if (skippedWeeks && skippedWeeks.length > 0) {
    for (const skip of skippedWeeks) {
      if (skip <= week) week++
    }
  }

  return week
}
