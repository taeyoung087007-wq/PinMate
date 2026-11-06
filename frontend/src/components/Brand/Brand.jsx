import styles from './Brand.module.css'

export default function Brand({ className = '' }) {
  return (
    <span className={`${styles.brand} ${className}`.trim()}>
      <img className={styles.symbol} src="/logo-symbol.png" alt="" aria-hidden="true" width="40" height="40" />
      <img className={styles.wordmark} src="/logo-wordmark.png" alt="PinMate" width="120" height="26" />
    </span>
  )
}
