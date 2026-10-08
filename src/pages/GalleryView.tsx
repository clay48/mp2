import { useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ALL_TYPES, dexNumber, displayName } from '../api/pokeapi'
import type { PokemonType } from '../api/pokeapi'
import { usePokedex } from '../context/pokedexStore'
import StatusMessage from '../components/StatusMessage'
import TypeBadge from '../components/TypeBadge'
import { detailPath } from '../navigation'
import type { DetailNavState } from '../navigation'
import styles from './GalleryView.module.css'
import badgeStyles from '../components/TypeBadge.module.css'

type MatchMode = 'any' | 'all'

function isType(value: string): value is PokemonType {
  return (ALL_TYPES as readonly string[]).includes(value)
}

export default function GalleryView() {
  const { state, retry } = usePokedex()
  const location = useLocation()
  // Selected filters live in the URL, e.g. /gallery?types=fire,flying&match=all
  const [params, setParams] = useSearchParams()
  const typesParam = params.get('types') ?? ''
  const selected = useMemo(() => typesParam.split(',').filter(isType), [typesParam])
  const mode: MatchMode = params.get('match') === 'all' ? 'all' : 'any'

  // Only offer types that at least one of these Pokémon has (PokéAPI uses current-generation typings).
  const availableTypes = useMemo(() => {
    if (state.status !== 'ready') return []
    const present = new Set(state.pokemon.flatMap((p) => p.types))
    return ALL_TYPES.filter((t) => present.has(t))
  }, [state])

  const counts = useMemo(() => {
    const map = new Map<PokemonType, number>()
    if (state.status === 'ready') {
      for (const p of state.pokemon) for (const t of p.types) map.set(t, (map.get(t) ?? 0) + 1)
    }
    return map
  }, [state])

  const results = useMemo(() => {
    if (state.status !== 'ready') return []
    if (selected.length === 0) return state.pokemon
    return state.pokemon.filter((p) =>
      mode === 'all' ? selected.every((t) => p.types.includes(t)) : selected.some((t) => p.types.includes(t)),
    )
  }, [state, selected, mode])

  const writeParams = (types: PokemonType[], nextMode: MatchMode) => {
    const next = new URLSearchParams()
    if (types.length) next.set('types', types.join(','))
    if (nextMode === 'all') next.set('match', 'all')
    setParams(next, { replace: true })
  }

  const toggleType = (type: PokemonType) => {
    const next = selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type]
    writeParams(next, mode)
  }

  const navState: DetailNavState = {
    sequence: results.map((p) => p.id),
    backTo: `/gallery${location.search}`,
    backLabel: 'gallery',
  }

  return (
    <section>
      <header className={styles.intro}>
        <h1 className={styles.heading}>Gallery</h1>
        <p className={styles.lede}>Pick one or more types to narrow the collection.</p>
      </header>

      {state.status === 'loading' && <StatusMessage kind="loading" title="Loading the Pokédex…" />}

      {state.status === 'error' && (
        <StatusMessage kind="error" title="Couldn’t load Pokémon" message={state.message} onRetry={retry} />
      )}

      {state.status === 'ready' && (
        <>
          <div className={styles.filters}>
            <div className={styles.filterHead}>
              <span className={styles.filterLabel} id="type-filter-label">
                Filter by type
              </span>
              <div className={styles.modeToggle} role="group" aria-label="How to combine types">
                <button
                  type="button"
                  className={mode === 'any' ? styles.modeActive : styles.mode}
                  aria-pressed={mode === 'any'}
                  onClick={() => writeParams(selected, 'any')}
                  title="Show Pokémon with any of the selected types"
                >
                  Any
                </button>
                <button
                  type="button"
                  className={mode === 'all' ? styles.modeActive : styles.mode}
                  aria-pressed={mode === 'all'}
                  onClick={() => writeParams(selected, 'all')}
                  title="Show Pokémon with all of the selected types"
                >
                  All
                </button>
              </div>
            </div>

            <div className={styles.chips} role="group" aria-labelledby="type-filter-label">
              {availableTypes.map((type) => {
                const on = selected.includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    className={`${styles.chip} ${badgeStyles[type]} ${on ? styles.chipOn : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleType(type)}
                  >
                    <span className={styles.chipDot} aria-hidden="true" />
                    {type}
                    <span className={styles.chipCount}>{counts.get(type)}</span>
                  </button>
                )
              })}
            </div>

            <div className={styles.summary} aria-live="polite">
              <span>
                Showing <strong>{results.length}</strong> of {state.pokemon.length}
              </span>
              {selected.length > 0 && (
                <button type="button" className={styles.clear} onClick={() => writeParams([], mode)}>
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <StatusMessage
              kind="empty"
              title="No Pokémon have all of those types"
              message="Switch to “Any” or remove a type to see results."
            />
          ) : (
            <ul className={styles.grid}>
              {results.map((p) => (
                <li key={p.id}>
                  <Link
                    to={detailPath(p.id)}
                    state={navState}
                    className={`${styles.card} ${badgeStyles[p.types[0]]}`}
                  >
                    <span className={styles.number}>{dexNumber(p.id)}</span>
                    <img
                      className={styles.art}
                      src={p.image}
                      alt={displayName(p.name)}
                      loading="lazy"
                      width={240}
                      height={240}
                    />
                    <span className={styles.caption}>
                      <span className={styles.name}>{displayName(p.name)}</span>
                      <span className={styles.types}>
                        {p.types.map((t) => (
                          <TypeBadge key={t} type={t} size="sm" />
                        ))}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
