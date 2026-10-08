/**
 * When you open a Pokémon from the list or gallery, the app passes along the
 * order you were looking at, so Previous/Next follow your filtered and sorted
 * results. Opening a detail URL directly falls back to Pokédex order.
 */
export interface DetailNavState {
  /** Pokédex ids in the order the user was browsing them. */
  sequence: number[]
  /** Where the "Back" link should return to, including search params. */
  backTo: string
  /** Label for the back link, e.g. "list" or "gallery". */
  backLabel: string
}

export function isDetailNavState(value: unknown): value is DetailNavState {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<DetailNavState>
  return (
    Array.isArray(v.sequence) &&
    v.sequence.length > 0 &&
    typeof v.backTo === 'string' &&
    typeof v.backLabel === 'string'
  )
}

export function detailPath(id: number): string {
  return `/pokemon/${id}`
}
