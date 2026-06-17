import { describe, expect, test } from 'bun:test'
import { cleanProxyResponseHeaders, selectNgrokStagingProxyTarget } from './ngrok-staging-proxy'

describe('ngrok staging proxy routing', () => {
  test('routes browser page navigations to the frontend', () => {
    expect(selectNgrokStagingProxyTarget({ method: 'GET', pathname: '/', accept: 'text/html' })).toBe('frontend')
    expect(selectNgrokStagingProxyTarget({ method: 'GET', pathname: '/chat', accept: 'text/html,application/xhtml+xml' })).toBe('frontend')
    expect(selectNgrokStagingProxyTarget({ method: 'GET', pathname: '/characters/abc', accept: 'text/html' })).toBe('frontend')
  })

  test('routes Vite dev assets to the frontend', () => {
    expect(selectNgrokStagingProxyTarget({ method: 'GET', pathname: '/@vite/client', accept: '*/*' })).toBe('frontend')
    expect(selectNgrokStagingProxyTarget({ method: 'GET', pathname: '/src/main.tsx', accept: '*/*' })).toBe('frontend')
    expect(selectNgrokStagingProxyTarget({ method: 'GET', pathname: '/assets/avatar.png', accept: 'image/png' })).toBe('frontend')
    expect(selectNgrokStagingProxyTarget({ method: 'GET', pathname: '/fonts/missai/source_sans/source-sans.woff2', accept: '*/*' })).toBe('frontend')
  })

  test('routes API calls to the backend even when paths overlap frontend routes', () => {
    expect(selectNgrokStagingProxyTarget({ method: 'POST', pathname: '/chat', accept: '*/*' })).toBe('backend')
    expect(selectNgrokStagingProxyTarget({ method: 'GET', pathname: '/characters/abc', accept: 'application/json' })).toBe('backend')
    expect(selectNgrokStagingProxyTarget({ method: 'GET', pathname: '/generation/templates', accept: '*/*' })).toBe('backend')
    expect(selectNgrokStagingProxyTarget({ method: 'OPTIONS', pathname: '/chat', accept: '*/*' })).toBe('backend')
  })

  test('removes decoded upstream response headers before returning to browsers', () => {
    const headers = cleanProxyResponseHeaders(
      new Headers({
        'content-encoding': 'gzip',
        'content-length': '123',
        'content-type': 'text/javascript',
        'transfer-encoding': 'chunked',
      }),
    )

    expect(headers.get('content-encoding')).toBeNull()
    expect(headers.get('content-length')).toBeNull()
    expect(headers.get('transfer-encoding')).toBeNull()
    expect(headers.get('content-type')).toBe('text/javascript')
  })
})
