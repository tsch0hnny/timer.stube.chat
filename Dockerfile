# StageTimer gig build: static output of `nuxt generate`, served by nginx.
# Build:  APP_VERSION=$(git describe --tags --always --dirty) docker compose -f deploy/compose.test.yml up -d --build
FROM node:24.22.3-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: skip the postinstall `nuxt prepare` (needs the sources, runs in generate anyway).
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION} NUXT_TELEMETRY_DISABLED=1
RUN npx nuxt generate

FROM nginx:1.30-alpine
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.output/public/ /usr/share/nginx/html/
ARG APP_VERSION=dev
LABEL org.opencontainers.image.version=${APP_VERSION} org.opencontainers.image.source="https://github.com/tsch0hnny/timer.stube.chat"
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO /dev/null http://127.0.0.1/manifest.webmanifest || exit 1
