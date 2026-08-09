import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // src/lib/sw.ts registers it, so the default inline script must not
      // register a second time.
      injectRegister: false,
      includeAssets: ['icon.svg', 'icon-180.png'],
      manifest: {
        name: 'Kraków ledger',
        short_name: 'Kraków',
        description: 'What you spent, what Mikko spent, and who ends up owing who.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b1416',
        theme_color: '#0b1416',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Firestore and Frankfurter must always hit the network; the SDK has
        // its own offline cache and stale rates are handled in fx.ts.
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.frankfurter\.dev\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fx',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
