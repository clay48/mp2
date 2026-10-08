import axios, { AxiosError } from 'axios'

/**
 * All PokéAPI calls go through this one Axios instance so the base URL,
 * timeout and error handling live in a single place.
 */
const client = axios.create({
  baseURL: 'https://pokeapi.co/api/v2',
  timeout: 15000,
})

/** How many Pokémon the app works with (the original 151). */
export const POKEDEX_SIZE = 151

/** The 18 main types. PokéAPI also lists "unknown", "shadow" and "stellar", which no Gen 1 Pokémon has. */
export const ALL_TYPES = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
] as const

export type PokemonType = (typeof ALL_TYPES)[number]

/** The lightweight record used by the list and gallery views. */
export interface PokemonSummary {
  id: number
  name: string
  types: PokemonType[]
  image: string
}

export interface PokemonStat {
  name: string
  value: number
}

/** Everything the detail view shows for one Pokémon. */
export interface PokemonDetail extends PokemonSummary {
  height: number // decimetres, as PokéAPI returns it
  weight: number // hectograms, as PokéAPI returns it
  baseExperience: number | null
  abilities: { name: string; hidden: boolean }[]
  stats: PokemonStat[]
  genus: string
  flavorText: string
  habitat: string | null
}

/* ---------- Raw response shapes (only the fields we read) ---------- */

interface NamedResource {
  name: string
  url: string
}

interface ListResponse {
  results: NamedResource[]
}

interface TypeResponse {
  name: string
  pokemon: { slot: number; pokemon: NamedResource }[]
}

interface PokemonResponse {
  id: number
  name: string
  height: number
  weight: number
  base_experience: number | null
  types: { slot: number; type: NamedResource }[]
  abilities: { is_hidden: boolean; ability: NamedResource }[]
  stats: { base_stat: number; stat: NamedResource }[]
  sprites: {
    front_default: string | null
    other?: { 'official-artwork'?: { front_default: string | null } }
  }
}

interface SpeciesResponse {
  genera: { genus: string; language: NamedResource }[]
  flavor_text_entries: { flavor_text: string; language: NamedResource }[]
  habitat: NamedResource | null
}

/* ---------- Helpers ---------- */

/** Resource URLs end in /<id>/, e.g. https://pokeapi.co/api/v2/pokemon/25/ */
function idFromUrl(url: string): number {
  const parts = url.split('/').filter(Boolean)
  return Number(parts[parts.length - 1])
}

/** Official artwork lives in PokéAPI's sprite repository, keyed by Pokédex number. */
export function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

/** Turns an Axios error into a sentence a user can read. */
export function describeError(err: unknown): string {
  if (axios.isCancel(err)) return 'The request was cancelled.'
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED') return 'PokéAPI took too long to respond.'
    if (err.response?.status === 404) return 'That Pokémon could not be found.'
    if (err.response) return `PokéAPI returned an error (${err.response.status}).`
    return 'Could not reach PokéAPI. Check your connection and try again.'
  }
  return 'Something went wrong while loading data.'
}

/* ---------- Caching ---------- */

// PokéAPI asks clients to cache responses. Results are kept in memory for the
// session, and the Pokédex index is also kept in sessionStorage so a refresh
// doesn't refetch all 18 type lists.
const SESSION_KEY = 'mp2-pokedex-v1'
let pokedexPromise: Promise<PokemonSummary[]> | null = null
const detailCache = new Map<number, Promise<PokemonDetail>>()

function readSessionCache(): PokemonSummary[] | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as PokemonSummary[]) : null
  } catch {
    return null
  }
}

function writeSessionCache(data: PokemonSummary[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch {
    // Storage can be full or disabled; the in-memory cache still works.
  }
}

/* ---------- Requests ---------- */

async function loadPokedex(): Promise<PokemonSummary[]> {
  // One request for the names, plus one per type to learn each Pokémon's types.
  const [list, typeLists] = await Promise.all([
    client.get<ListResponse>('/pokemon', { params: { limit: POKEDEX_SIZE, offset: 0 } }),
    Promise.all(ALL_TYPES.map((type) => client.get<TypeResponse>(`/type/${type}`))),
  ])

  // id -> types, ordered by slot (primary type first)
  const typesById = new Map<number, { slot: number; type: PokemonType }[]>()
  for (const { data } of typeLists) {
    for (const entry of data.pokemon) {
      const id = idFromUrl(entry.pokemon.url)
      if (id > POKEDEX_SIZE) continue
      const current = typesById.get(id) ?? []
      current.push({ slot: entry.slot, type: data.name as PokemonType })
      typesById.set(id, current)
    }
  }

  return list.data.results.map((item) => {
    const id = idFromUrl(item.url)
    const types = (typesById.get(id) ?? [])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type)
    return { id, name: item.name, types, image: artworkUrl(id) }
  })
}

/** The Gen 1 Pokédex with names, types and artwork. Fetched once per session. */
export function getPokedex(): Promise<PokemonSummary[]> {
  if (!pokedexPromise) {
    const cached = readSessionCache()
    if (cached && cached.length === POKEDEX_SIZE) {
      pokedexPromise = Promise.resolve(cached)
    } else {
      pokedexPromise = loadPokedex().then((data) => {
        writeSessionCache(data)
        return data
      })
      // Don't cache a failure; let the next call try again.
      pokedexPromise.catch(() => {
        pokedexPromise = null
      })
    }
  }
  return pokedexPromise
}

function cleanText(text: string): string {
  // Flavor text from the games contains form feeds and hard line breaks.
  return text.replace(/[\f\n\r­]+/g, ' ').replace(/\s+/g, ' ').trim()
}

async function loadDetail(id: number): Promise<PokemonDetail> {
  const [{ data: p }, { data: s }] = await Promise.all([
    client.get<PokemonResponse>(`/pokemon/${id}`),
    client.get<SpeciesResponse>(`/pokemon-species/${id}`),
  ])

  const english = <T extends { language: NamedResource }>(items: T[]) =>
    items.find((item) => item.language.name === 'en')

  return {
    id: p.id,
    name: p.name,
    types: [...p.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name as PokemonType),
    image:
      p.sprites.other?.['official-artwork']?.front_default ??
      p.sprites.front_default ??
      artworkUrl(p.id),
    height: p.height,
    weight: p.weight,
    baseExperience: p.base_experience,
    abilities: p.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    stats: p.stats.map((st) => ({ name: st.stat.name, value: st.base_stat })),
    genus: english(s.genera)?.genus ?? '',
    flavorText: cleanText(english(s.flavor_text_entries)?.flavor_text ?? ''),
    habitat: s.habitat?.name ?? null,
  }
}

/** Full details for one Pokémon (two requests), cached for the session. */
export function getPokemonDetail(id: number): Promise<PokemonDetail> {
  let promise = detailCache.get(id)
  if (!promise) {
    promise = loadDetail(id)
    detailCache.set(id, promise)
    promise.catch(() => detailCache.delete(id))
  }
  return promise
}

/** "mr-mime" -> "Mr Mime", "nidoran-f" -> "Nidoran ♀" */
export function displayName(name: string): string {
  if (name === 'nidoran-f') return 'Nidoran ♀'
  if (name === 'nidoran-m') return 'Nidoran ♂'
  if (name === 'mr-mime') return 'Mr. Mime'
  if (name === 'farfetchd') return "Farfetch'd"
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** 25 -> "#025" */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}

/** The small in-game sprite, used in the list view. */
export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}
