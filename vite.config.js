import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base:
    process.env.GITHUB_PAGES === 'true' && process.env.npm_lifecycle_event === 'build'
      ? '/did-i/'
      : '/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Did I',
        short_name: 'Did I',
        description: 'The unanswered question for tonight. Hit DID.',
        theme_color: '#1c1410',
        background_color: '#1c1410',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 48741,
    strictPort: true,
    watch: {
      ignored: ['**/docs/demo/**'],
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 48741,
    strictPort: true,
  },
})
