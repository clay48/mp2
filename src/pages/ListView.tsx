import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { dexNumber, displayName, spriteUrl } from '../api/pokeapi'
import type { PokemonSummary } from '../api/pokeapi'
import { usePokedex } from '../context/pokedexStore'
import StatusMessage from '../components/StatusMessage'
import TypeBadge from '../components/TypeBadge'
import { detailPath } from '../navigation'
import type { DetailNavState } from '../navigation'
import styles from './ListView.module.css'

type SortKey = 'number' | 'name' | 'type'
type SortOrder = 'asc' | 'desc'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'number', label: 'Pokédex #' },
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Primary type' },
]

function compare(a: PokemonSummary, b: PokemonSummary, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name)
    case 'type':
      // Group by primary type, then keep Pokédex order inside each group.
      return a.types[0].localeCompare(b.types[0]) || a.id - b.id
    default:
      return a.id - b.id
  }
}

function matches(p: PokemonSummary, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase().replace(/^#/, '')
  return (
    p.name.includes(q) ||
    displayName(p.name).toLowerCase().includes(q) ||
    String(p.id) === q.replace(/^0+/, '') ||
    p.types.some((t) => t === q)
  )
}

export default function ListView() {
  const { state, retry } = usePokedex()
  const location = useLocation()
  // Search and sort live in the URL, so they survive going to a detail page and back.
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const sortKey = (SORT_OPTIONS.some((o) => o.key === params.get('sort')) ? params.get('sort') : 'number') as SortKey
  const order: SortOrder = params.get('order') === 'desc' ? 'desc' : 'asc'

  const updateParam = (name: string, value: string, defaultValue: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === defaultValue) next.delete(name)
        else next.set(name, value)
        return next
      },
      { replace: true },
    )
  }

  const results = useMemo(() => {
    if (state.status !== 'ready') return []
    const filtered = state.pokemon.filter((p) => matches(p, query.trim()))
    const direction = order === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => compare(a, b, sortKey) * direction)
  }, [state, query, sortKey, order])

  const navState: DetailNavState = {
    sequence: results.map((p) => p.id),
    backTo: `/list${location.search}`,
    backLabel: 'list',
  }

  return (
    <section>
      <header className={styles.intro}>
        <h1 className={styles.heading}>Search the Pokédex</h1>
        <p className={styles.lede}>Filter by name, number or type as you type, then sort the results.</p>
      </header>

      <div className={styles.controls}>
        <label className={styles.search}>
          <span className="visually-hidden">Search Pokémon</span>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Try “char”, “25” or “water”"
            value={query}
            onChange={(e) => updateParam('q', e.target.value, '')}
            autoComplete="off"
            spellCheck={false}
          />
        </label>

        <div className={styles.sortRow}>
          <fieldset className={styles.group}>
            <legend className={styles.groupLabel}>Sort by</legend>
            <div className={styles.segmented}>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={option.key === sortKey ? styles.segmentActive : styles.segment}
                  aria-pressed={option.key === sortKey}
                  onClick={() => updateParam('sort', option.key, 'number')}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.group}>
            <legend className={styles.groupLabel}>Order</legend>
            <div className={styles.segmented}>
              <button
                type="button"
                className={order === 'asc' ? styles.segmentActive : styles.segment}
                aria-pressed={order === 'asc'}
                onClick={() => updateParam('order', 'asc', 'asc')}
              >
                ↑ Ascending
              </button>
              <button
                type="button"
                className={order === 'desc' ? styles.segmentActive : styles.segment}
                aria-pressed={order === 'desc'}
                onClick={() => updateParam('order', 'desc', 'asc')}
              >
                ↓ Descending
              </button>
            </div>
          </fieldset>
        </div>
      </div>

      {state.status === 'loading' && <StatusMessage kind="loading" title="Loading the Pokédex…" />}

      {state.status === 'error' && (
        <StatusMessage kind="error" title="Couldn’t load Pokémon" message={state.message} onRetry={retry} />
      )}

      {state.status === 'ready' && (
        <>
          <p className={styles.count} aria-live="polite">
            {results.length === state.pokemon.length
              ? `${results.length} Pokémon`
              : `${results.length} of ${state.pokemon.length} Pokémon match “${query.trim()}”`}
          </p>

          {results.length === 0 ? (
            <StatusMessage
              kind="empty"
              title="No matches"
              message="Nothing in the first 151 matches that search. Try part of a name, a number, or a type."
            />
          ) : (
            <ol className={styles.list}>
              {results.map((p) => (
                <li key={p.id}>
                  <Link to={detailPath(p.id)} state={navState} className={styles.row}>
                    <span className={styles.number}>{dexNumber(p.id)}</span>
                    <img className={styles.sprite} src={spriteUrl(p.id)} alt="" loading="lazy" width={56} height={56} />
                    <span className={styles.name}>{displayName(p.name)}</span>
                    <span className={styles.types}>
                      {p.types.map((t) => (
                        <TypeBadge key={t} type={t} size="sm" />
                      ))}
                    </span>
                    <span className={styles.chevron} aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
