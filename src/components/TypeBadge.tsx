import type { PokemonType } from '../api/pokeapi'
import styles from './TypeBadge.module.css'

export default function TypeBadge({ type, size = 'md' }: { type: PokemonType; size?: 'sm' | 'md' }) {
  return <span className={`${styles.badge} ${styles[type]} ${styles[size]}`}>{type}</span>
}
