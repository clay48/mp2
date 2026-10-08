import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { POKEDEX_SIZE, describeError, dexNumber, displayName, getPokemonDetail } from '../api/pokeapi'
import type { PokemonDetail } from '../api/pokeapi'
import { usePokedex } from '../context/pokedexStore'
import StatusMessage from '../components/StatusMessage'
import TypeBadge from '../components/TypeBadge'
import { detailPath, isDetailNavState } from '../navigation'
import type { DetailNavState } from '../navigation'
import styles from './DetailView.module.css'
import badgeStyles from '../components/TypeBadge.module.css'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

/** Highest possible base stat in the games; used as the bar maximum. */
const MAX_STAT = 255

const FULL_DEX: number[] = Array.from({ length: POKEDEX_SIZE }, (_, i) => i + 1)

// Results are tagged with the id they belong to, so a stale result shows as loading.
type LoadResult =
  | { id: number; status: 'error'; message: string }
  | { id: number; status: 'ready'; pokemon: PokemonDetail }

function titleCase(text: string): string {
  return text
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function DetailView() {
  const { id: idParam } = useParams()
  const id = Number(idParam)
  const valid = Number.isInteger(id) && id >= 1 && id <= POKEDEX_SIZE

  const location = useLocation()
  const navigate = useNavigate()
  const { state: dex } = usePokedex()
  const [result, setResult] = useState<LoadResult | null>(null)
  const [attempt, setAttempt] = useState(0)

  // Use the order the user was browsing in; fall back to Pokédex order for direct links.
  const navState: DetailNavState = useMemo(() => {
    const incoming: unknown = location.state
    if (isDetailNavState(incoming) && incoming.sequence.includes(id)) return incoming
    return { sequence: FULL_DEX, backTo: '/list', backLabel: 'list' }
  }, [location.state, id])

  const { sequence } = navState
  const position = sequence.indexOf(id)
  // Previous/Next wrap around at either end.
  const prevId = sequence[(position - 1 + sequence.length) % sequence.length]
  const nextId = sequence[(position + 1) % sequence.length]

  const nameFor = (otherId: number) => {
    if (dex.status !== 'ready') return dexNumber(otherId)
    const found = dex.pokemon.find((p) => p.id === otherId)
    return found ? displayName(found.name) : dexNumber(otherId)
  }

  useEffect(() => {
    if (!valid) return
    let active = true
    getPokemonDetail(id)
      .then((pokemon) => {
        if (active) setResult({ id, status: 'ready', pokemon })
      })
      .catch((err: unknown) => {
        if (active) setResult({ id, status: 'error', message: describeError(err) })
      })
    return () => {
      active = false
    }
  }, [id, valid, attempt])

  // Left/right arrow keys also step through the sequence.
  useEffect(() => {
    if (!valid) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.key === 'ArrowLeft') navigate(detailPath(prevId), { state: navState })
      if (e.key === 'ArrowRight') navigate(detailPath(nextId), { state: navState })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [valid, prevId, nextId, navState, navigate])

  const load = result && result.id === id ? result : null

  if (!valid) {
    return (
      <StatusMessage
        kind="error"
        title="No Pokémon here"
        message={`This index covers Pokédex numbers 1 to ${POKEDEX_SIZE}. Head back to the list to pick one.`}
      />
    )
  }

  return (
    <article className={styles.page}>
      <div className={styles.topBar}>
        <Link to={navState.backTo} className={styles.back}>
          ← Back to {navState.backLabel}
        </Link>
        <span className={styles.position}>
          {position + 1} of {sequence.length}
        </span>
      </div>

      <nav className={styles.stepper} aria-label="Browse Pokémon">
        <Link to={detailPath(prevId)} state={navState} className={styles.step} rel="prev">
          <span className={styles.stepArrow} aria-hidden="true">
            ←
          </span>
          <span className={styles.stepText}>
            <span className={styles.stepLabel}>Previous</span>
            <span className={styles.stepName}>
              {dexNumber(prevId)} {nameFor(prevId)}
            </span>
          </span>
        </Link>
        <Link to={detailPath(nextId)} state={navState} className={`${styles.step} ${styles.stepNext}`} rel="next">
          <span className={styles.stepText}>
            <span className={styles.stepLabel}>Next</span>
            <span className={styles.stepName}>
              {dexNumber(nextId)} {nameFor(nextId)}
            </span>
          </span>
          <span className={styles.stepArrow} aria-hidden="true">
            →
          </span>
        </Link>
      </nav>

      {!load && <StatusMessage kind="loading" title={`Loading ${nameFor(id)}…`} />}

      {load?.status === 'error' && (
        <StatusMessage
          kind="error"
          title="Couldn’t load this Pokémon"
          message={load.message}
          onRetry={() => {
            setResult(null)
            setAttempt((n) => n + 1)
          }}
        />
      )}

      {load?.status === 'ready' && <DetailBody pokemon={load.pokemon} />}
    </article>
  )
}

function DetailBody({ pokemon: p }: { pokemon: PokemonDetail }) {
  const total = p.stats.reduce((sum, s) => sum + s.value, 0)

  return (
    <div className={`${styles.body} ${badgeStyles[p.types[0]]}`}>
      <div className={styles.hero}>
        <span className={styles.bigNumber} aria-hidden="true">
          {String(p.id).padStart(3, '0')}
        </span>
        <img className={styles.art} src={p.image} alt={`Official artwork of ${displayName(p.name)}`} />
      </div>

      <div className={styles.info}>
        <p className={styles.number}>{dexNumber(p.id)}</p>
        <h1 className={styles.name}>{displayName(p.name)}</h1>
        {p.genus && <p className={styles.genus}>{p.genus}</p>}
        <div className={styles.types}>
          {p.types.map((t) => (
            <TypeBadge key={t} type={t} />
          ))}
        </div>

        {p.flavorText && <p className={styles.flavor}>{p.flavorText}</p>}

        <dl className={styles.facts}>
          <div>
            <dt>Height</dt>
            <dd>{(p.height / 10).toFixed(1)} m</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{(p.weight / 10).toFixed(1)} kg</dd>
          </div>
          <div>
            <dt>Base XP</dt>
            <dd>{p.baseExperience ?? '—'}</dd>
          </div>
          <div>
            <dt>Habitat</dt>
            <dd>{p.habitat ? titleCase(p.habitat) : '—'}</dd>
          </div>
        </dl>

        <h2 className={styles.subhead}>Abilities</h2>
        <ul className={styles.abilities}>
          {p.abilities.map((a) => (
            <li key={a.name} className={styles.ability}>
              {titleCase(a.name)}
              {a.hidden && <span className={styles.hidden}>hidden</span>}
            </li>
          ))}
        </ul>

        <h2 className={styles.subhead}>Base stats</h2>
        <dl className={styles.stats}>
          {p.stats.map((s) => (
            <div key={s.name} className={styles.statRow}>
              <dt>{STAT_LABELS[s.name] ?? titleCase(s.name)}</dt>
              <dd className={styles.statValue}>{s.value}</dd>
              <dd className={styles.statBar}>
                <progress value={s.value} max={MAX_STAT} aria-label={`${STAT_LABELS[s.name] ?? s.name}: ${s.value}`} />
              </dd>
            </div>
          ))}
          <div className={`${styles.statRow} ${styles.totalRow}`}>
            <dt>Total</dt>
            <dd className={styles.statValue}>{total}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
