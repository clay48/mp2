import { NavLink, Outlet, Link } from 'react-router-dom'
import styles from './Layout.module.css'

export default function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/list" className={styles.brand}>
            <span className={styles.mark} aria-hidden="true" />
            <span className={styles.brandText}>
              <span className={styles.brandName}>Kanto Index</span>
              <span className={styles.brandSub}>The original 151</span>
            </span>
          </Link>
          <nav aria-label="Views" className={styles.nav}>
            <NavLink to="/list" className={navClass}>
              List
            </NavLink>
            <NavLink to="/gallery" className={navClass}>
              Gallery
            </NavLink>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        Data and artwork from <a href="https://pokeapi.co/">PokéAPI</a>. Pokémon is © Nintendo, Game Freak
        and Creatures. Built for CS 409 MP2.
      </footer>
    </div>
  )
}
