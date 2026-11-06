import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ThemeProvider, { useTheme } from './theme.jsx'

function CurrentTheme() {
  const { mode, resolvedTheme } = useTheme()
  return <output>{mode}:{resolvedTheme}</output>
}

function renderTheme() {
  return renderToStaticMarkup(<ThemeProvider><CurrentTheme /></ThemeProvider>)
}

function browser(savedMode, dark = false) {
  return {
    localStorage: { getItem: () => savedMode },
    matchMedia: () => ({ matches: dark }),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('ThemeProvider initial mode', () => {
  it('renders safely without browser globals', () => {
    vi.stubGlobal('window', undefined)
    expect(renderTheme()).toBe('<output>system:light</output>')
  })

  it.each([
    ['light', true, 'light:light'],
    ['dark', false, 'dark:dark'],
    ['system', true, 'system:dark'],
    [null, true, 'system:dark'],
    ['invalid', false, 'system:light'],
  ])('resolves saved %s mode against the system setting', (savedMode, dark, expected) => {
    vi.stubGlobal('window', browser(savedMode, dark))
    expect(renderTheme()).toBe(`<output>${expected}</output>`)
  })

  it('follows the system when accessing localStorage is denied', () => {
    const environment = browser(null, true)
    Object.defineProperty(environment, 'localStorage', {
      get() { throw new Error('Storage is blocked') },
    })
    vi.stubGlobal('window', environment)
    expect(renderTheme()).toBe('<output>system:dark</output>')
  })

  it('follows the system when reading saved mode fails', () => {
    const environment = browser(null, true)
    environment.localStorage.getItem = () => { throw new Error('Storage is blocked') }
    vi.stubGlobal('window', environment)
    expect(renderTheme()).toBe('<output>system:dark</output>')
  })

  it('uses light when matchMedia is unavailable', () => {
    const environment = browser('system')
    delete environment.matchMedia
    vi.stubGlobal('window', environment)
    expect(renderTheme()).toBe('<output>system:light</output>')
  })
})
