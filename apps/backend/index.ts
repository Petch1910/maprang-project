import 'dotenv/config'
import { cors } from '@elysiajs/cors'
import { Elysia } from 'elysia'
import { rateLimit } from 'elysia-rate-limit'
import { adminRoutes } from './src/admin.routes'
import { characterRoutes } from './src/character.routes'
import { chatRoutes } from './src/chat.routes'
import { generationRoutes } from './src/generation.routes'
import { healthRoutes } from './src/health.routes'
import { loreRoutes } from './src/lore.routes'
import { reportRoutes } from './src/report.routes'
import { AuthError, authErrorResponse, buildRateLimitErrorResponse, rateLimitRequestKey, routeRateLimitMax } from './src/security'
import { uploadRoutes } from './src/upload.routes'
import { userRoutes } from './src/user.routes'
import { allowedOrigins, serverHost, serverPort } from './src/config'
import { logRuntimeEnvStatus } from './src/env'

logRuntimeEnvStatus()

export const app = new Elysia()
  .onError(({ error, set }) => {
    if (error instanceof AuthError) {
      set.status = 401
      return authErrorResponse(error)
    }
  })
  .use(
    cors({
      origin: allowedOrigins,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-user-id',
        'x-admin-key',
        'x-user-api-key',
        'x-user-api-provider',
        'x-user-api-vault',
        'ngrok-skip-browser-warning',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  )
  .use(
    rateLimit({
      duration: 60_000,
      max: routeRateLimitMax,
      generator: (request) => rateLimitRequestKey(request),
      errorResponse: buildRateLimitErrorResponse(),
    }),
  )
  .get('/', () => ({
    ok: true,
    service: 'maprang-backend',
  }))
  .use(healthRoutes)
  .use(adminRoutes)
  .use(userRoutes)
  .use(uploadRoutes)
  .use(generationRoutes)
  .use(characterRoutes)
  .use(loreRoutes)
  .use(chatRoutes)
  .use(reportRoutes)
  .listen({
    hostname: serverHost,
    port: serverPort,
  })

console.log(`Server is running at http://${serverHost}:${serverPort}`)

export type App = typeof app
