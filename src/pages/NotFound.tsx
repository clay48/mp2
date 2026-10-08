import { Link } from 'react-router-dom'
import StatusMessage from '../components/StatusMessage'
import styles from './NotFound.module.css'

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <StatusMessage kind="empty" title="Page not found" message="That page doesn’t exist in this Pokédex." />
      <Link to="/list" className={styles.link}>
        Go to the list
      </Link>
    </div>
  )
}
