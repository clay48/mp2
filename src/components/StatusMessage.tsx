import styles from './StatusMessage.module.css'

interface Props {
  kind: 'loading' | 'error' | 'empty'
  title: string
  message?: string
  onRetry?: () => void
}

/** Shared loading / error / empty-state block. */
export default function StatusMessage({ kind, title, message, onRetry }: Props) {
  return (
    <div className={`${styles.box} ${styles[kind]}`} role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'loading' && <span className={styles.spinner} aria-hidden="true" />}
      <p className={styles.title}>{title}</p>
      {message && <p className={styles.message}>{message}</p>}
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
