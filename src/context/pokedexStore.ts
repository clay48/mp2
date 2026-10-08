import { createContext, useContext } from 'react'
import type { PokemonSummary } from '../api/pokeapi'

export type PokedexState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; pokemon: PokemonSummary[] }

export interface PokedexContextValue {
  state: PokedexState
  retry: () => void
}

export const PokedexContext = createContext<PokedexContextValue | null>(null)

export function usePokedex(): PokedexContextValue {
  const value = useContext(PokedexContext)
  if (!value) throw new Error('usePokedex must be used inside <PokedexProvider>')
  return value
}
