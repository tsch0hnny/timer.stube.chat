// StageTimer: a client-only static PWA. `nuxt generate` emits index.html (+ 200/404 fallbacks),
// hashed assets under /_nuxt/, the service worker and the manifest; nginx serves them as-is.
const APP_VERSION = process.env.APP_VERSION || 'dev'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  // Timer state lives only in localStorage, so there is nothing to server-render; a pure client
  // app also avoids a flash of the presets before a stored running timer is restored.
  ssr: false,
  devtools: { enabled: false },
  telemetry: false,
  modules: ['@vite-pwa/nuxt'],
  css: ['~/assets/main.css'],

  runtimeConfig: {
    public: { appVersion: APP_VERSION },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'StageTimer',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#000000' },
        // Same home-screen meta as the device spike, so its measurements apply to this app.
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'StageTimer' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        // Static, not injected by JS (the module's <VitePwaManifest/> only adds it at runtime).
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', href: '/icon-192.png' },
      ],
      // Black before any CSS or JS arrives: no white flash on a dark stage.
      style: [{ innerHTML: 'html,body{background:#000;color:#fff;margin:0}' }],
    },
  },

  hooks: {
    // Client-only app: generate the shell (index.html, 200.html, 404.html) and nothing else.
    'prerender:routes'({ routes }) {
      routes.clear()
    },
  },

  pwa: {
    // Never reload on its own: a reload would drop the wake lock until the next tap.
    // A waiting update is offered on the presets screen only (see useAppUpdate).
    registerType: 'prompt',
    manifest: {
      id: '/',
      name: 'StageTimer',
      short_name: 'StageTimer',
      description: 'Set timer for the stage.',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      display_override: ['fullscreen', 'standalone'],
      background_color: '#000000',
      theme_color: '#000000',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Everything the app needs offline is precached at install; navigations get the shell.
      globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest,json}'],
      navigateFallback: '/',
      cleanupOutdatedCaches: true,
    },
    client: {
      installPrompt: false,
      periodicSyncForUpdates: 0,
    },
    devOptions: { enabled: false },
  },

  experimental: {
    // Off: it polls an unhashed /_nuxt/builds/latest.json (which nginx would cache as immutable)
    // to detect new builds. Updates are handled by the service worker prompt instead.
    appManifest: false,
  },

  typescript: {
    strict: true,
  },
})
