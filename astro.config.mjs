// @ts-check
import process from 'node:process'
import { defineConfig, envField } from 'astro/config'
import vue from '@astrojs/vue'
import vercel from '@astrojs/vercel'
import tailwindcss from '@tailwindcss/vite'
import VitePWA from '@vite-pwa/astro'

// https://astro.build/config
const apiBase = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '')

/**
 * @param {{ request: Request }} ctx
 */
function isNavigation({ request }) {
  return request.mode === 'navigate'
}

/**
 * @param {{ url: URL }} ctx
 */
function isApiRequest({ url }) {
  return url.origin === new URL(apiBase).origin
}

/** @type {'StaleWhileRevalidate'} */
const swrHandler = 'StaleWhileRevalidate'

/** @type {'GET'} */
const getMethod = 'GET'

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Internship Tracker',
        short_name: 'Tracker',
        description: 'Seguimiento de pasantías: bitácora, notas y asistencia.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: isNavigation,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          ...(apiBase
            ? [
                {
                  urlPattern: isApiRequest,
                  handler: swrHandler,
                  method: getMethod,
                  options: {
                    cacheName: 'api',
                    expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
                  },
                },
              ]
            : []),
        ],
      },
    }),
  ],
  env: {
    schema: {
      PUBLIC_API_URL: envField.string({
        context: 'client',
        access: 'public',
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  server: { port: 5173 },
})
