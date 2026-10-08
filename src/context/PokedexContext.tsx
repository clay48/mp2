import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { describeError, getPokedex } from '../api/pokeapi'
import { PokedexContext } from './pokedexStore'
import type { PokedexState } from './pokedexStore'

/** Loads the Pokédex once and shares it between the list, gallery and detail views. */
export function PokedexProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PokedexState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getPokedex()
      .then((pokemon) => {
        if (active) setState({ status: 'ready', pokemon })
      })
      .catch((err: unknown) => {
        if (active) setState({ status: 'error', message: describeError(err) })
      })
    return () => {
      active = false
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return <PokedexContext.Provider value={{ state, retry }}>{children}</PokedexContext.Provider>
}
