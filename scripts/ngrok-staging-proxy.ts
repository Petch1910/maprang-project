type ProxyTarget = 'backend' | 'frontend'

export type NgrokProxyRouteInput = {
  method: string
  pathname: string
  accept?: string | null
}

const frontendAssetPrefixes = [
  '/@fs/',
  '/@id/',
  '/@react-refresh',
  '/@vite/',
  '/assets/',
  '/fonts/',
  '/node_modules/',
  '/src/',
]

const frontendExactPaths = new Set(['/favicon.ico', '/vite.svg'])

function isHtmlNavigation(input: NgrokProxyRouteInput) {
  return input.method.toUpperCase() === 'GET' && (input.accept ?? '').toLowerCase().includes('text/html')
}

export function selectNgrokStagingProxyTarget(input: NgrokProxyRouteInput): ProxyTarget {
  const pathname = input.pathname || '/'

  if (frontendExactPaths.has(pathname)) return 'frontend'
  if (frontendAssetPrefixes.some((prefix) => pathname.startsWith(prefix))) return 'frontend'
  if (isHtmlNavigation(input)) return 'frontend'

  return 'backend'
}

function cleanProxyHeaders(headers: Headers, target: ProxyTarget) {
  const clean = new Headers(headers)
  for (const header of ['connection', 'content-length', 'host', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']) {
    clean.delete(header)
  }

  if (target === 'backend') {
    clean.delete('origin')
    clean.set('ngrok-skip-browser-warning', '69420')
  }

  clean.set('x-maprang-ngrok-proxy-target', target)
  return clean
}

function targetUrl(requestUrl: string, targetOrigin: string) {
  const url = new URL(requestUrl)
  return new URL(`${url.pathname}${url.search}`, targetOrigin)
}

export function cleanProxyResponseHeaders(headers: Headers) {
  const clean = new Headers(headers)
  for (const header of ['content-encoding', 'content-length', 'transfer-encoding']) {
    clean.delete(header)
  }
  return clean
}

async function proxyRequest(request: Request, target: ProxyTarget, targetOrigin: string) {
  const method = request.method.toUpperCase()
  const init: RequestInit = {
    method,
    headers: cleanProxyHeaders(request.headers, target),
    redirect: 'manual',
  }

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = request.body
  }

  const upstream = await fetch(targetUrl(request.url, targetOrigin), init)
  const responseHeaders = cleanProxyResponseHeaders(upstream.headers)
  responseHeaders.set('x-maprang-ngrok-proxy-target', target)

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

if (import.meta.main) {
  const port = Number.parseInt(process.env.NGROK_PROXY_PORT ?? '8787', 10)
  const backendOrigin = process.env.NGROK_BACKEND_ORIGIN ?? 'http://127.0.0.1:3001'
  const frontendOrigin = process.env.NGROK_FRONTEND_ORIGIN ?? 'http://127.0.0.1:5173'

  Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url)
      const target = selectNgrokStagingProxyTarget({
        method: request.method,
        pathname: url.pathname,
        accept: request.headers.get('accept'),
      })

      return proxyRequest(request, target, target === 'frontend' ? frontendOrigin : backendOrigin)
    },
  })

  console.log(`Maprang ngrok staging proxy listening on http://127.0.0.1:${port}`)
  console.log(`- frontend: ${frontendOrigin}`)
  console.log(`- backend:  ${backendOrigin}`)
}
