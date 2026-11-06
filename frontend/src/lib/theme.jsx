import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'pinmate_theme'
const SYSTEM_QUERY = '(prefers-color-scheme: dark)'
const ThemeContext = createContext(null)

function readMode() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return ['system', 'light', 'dark'].includes(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

function readSystemTheme() {
  return typeof window !== 'undefined' && window.matchMedia?.(SYSTEM_QUERY).matches ? 'dark' : 'light'
}

export default function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readMode)
  const [systemTheme, setSystemTheme] = useState(readSystemTheme)
  const resolvedTheme = mode === 'system' ? systemTheme : mode

  useEffect(() => {
    const media = window.matchMedia?.(SYSTEM_QUERY)
    if (!media) return

    const update = () => setSystemTheme(media.matches ? 'dark' : 'light')
    update()
    if (media.addEventListener) {
      media.addEventListener('change', update)
      return () => media.removeEventListener('change', update)
    }
    media.addListener(update)
    return () => media.removeListener(update)
  }, [])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.dataset.themeMode = mode
  }, [mode, resolvedTheme])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Storage can be blocked; the selected mode still works for this session.
    }
  }, [mode])

  const value = useMemo(() => ({ mode, setMode, resolvedTheme }), [mode, resolvedTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- The provider and hook share the required public module.
export function useTheme() {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('useTheme must be used within ThemeProvider')
  return theme
}
