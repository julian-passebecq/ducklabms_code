export function parseStoredStringSet(raw: string | null, allowed?: ReadonlySet<string>): Set<string> {
  if (!raw) return new Set()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    const strings = parsed.filter((value): value is string => typeof value === 'string')
    const filtered = allowed ? strings.filter(value => allowed.has(value)) : strings
    return new Set(filtered)
  } catch {
    return new Set()
  }
}

export function parseStoredBoolean(raw: string | null, fallback: boolean): boolean {
  if (raw === null) return fallback
  if (raw === 'true') return true
  if (raw === 'false') return false
  return fallback
}
