import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../lib/theme.jsx'
import styles from './AppearanceSwitcher.module.css'

const MODES = [
  { value: 'system', label: '시스템 모드', text: '시스템', Icon: Monitor },
  { value: 'light', label: '라이트 모드', text: '라이트', Icon: Sun },
  { value: 'dark', label: '다크 모드', text: '다크', Icon: Moon },
]

export default function AppearanceSwitcher({ className = '' }) {
  const { mode, setMode } = useTheme()

  return (
    <div className={`${styles.switcher} ${className}`.trim()} role="group" aria-label="화면 테마">
      {MODES.map(({ value, label, text, Icon }) => (
        <button
          key={value}
          type="button"
          className={styles.option}
          aria-label={label}
          aria-pressed={mode === value}
          title={label}
          onClick={() => setMode(value)}
        >
          <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className={styles.label}>{text}</span>
        </button>
      ))}
    </div>
  )
}
