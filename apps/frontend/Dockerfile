FROM oven/bun:1.3.13-alpine AS deps
WORKDIR /app
COPY apps/frontend/package.json apps/frontend/bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.13-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY apps/frontend ./
ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_PUBLIC=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
RUN VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_PUBLIC bun run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
