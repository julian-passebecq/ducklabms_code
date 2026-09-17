export type SearchableItem<T> = T & {
  title: string
  searchText: string
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function tokenizeSearchQuery(query: string) {
  return normalize(query).split(' ').filter(Boolean)
}

export function searchMatch(text: string, query: string) {
  const haystack = normalize(text)
  const tokens = tokenizeSearchQuery(query)
  if (!tokens.length) return false
  return tokens.every(token => haystack.includes(token))
}

export function rankSearchCandidates<T>(items: SearchableItem<T>[], query: string, limit = 12) {
  const normalized = normalize(query)
  const tokens = tokenizeSearchQuery(query)
  if (normalized.length < 2 || !tokens.length) return []

  const score = (item: SearchableItem<T>) => {
    const title = normalize(item.title)
    const haystack = normalize(item.searchText)
    if (title === normalized) return 0
    if (title.startsWith(normalized)) return 1
    if (title.includes(normalized)) return 2
    if (tokens.every(token => title.includes(token))) return 3
    if (tokens.every(token => haystack.includes(token))) return 4
    return 9
  }

  return items
    .filter(item => searchMatch(item.searchText, query))
    .sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title))
    .slice(0, limit)
}

export function moveSearchIndex(current: number, direction: 1 | -1, length: number) {
  if (length <= 0) return -1
  if (current < 0 || current >= length) return direction === 1 ? 0 : length - 1
  return (current + direction + length) % length
}
