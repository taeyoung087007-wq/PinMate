import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('Vercel API proxy configuration', () => {
  it.each([
    undefined,
    '',
    'http://pinmate-backend.onrender.com',
    'https://pinmate-backend.onrender.com/api',
    'https://user:password@pinmate-backend.onrender.com',
    'https://pinmate-backend.onrender.com?key=value',
    'https://pinmate-backend.onrender.com#fragment',
  ])('rejects an invalid backend origin: %s', async origin => {
    vi.stubEnv('BACKEND_ORIGIN', origin)
    await expect(import('./vercel.ts')).rejects.toThrow()
  })

  it('proxies API paths before the SPA fallback and disables API caching', async () => {
    vi.stubEnv('BACKEND_ORIGIN', ' https://pinmate-backend.onrender.com/ ')
    const { config } = await import('./vercel.ts')

    expect(config.rewrites).toEqual([
      { source: '/api/:path*', destination: 'https://pinmate-backend.onrender.com/api/:path*' },
      { source: '/(.*)', destination: '/index.html' },
    ])
    expect(config.headers).toContainEqual({
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'x-vercel-enable-rewrite-caching', value: '0' },
      ],
    })
  })
})
