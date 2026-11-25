import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/maskable.svg'],
      manifest: {
        id: '/',
        name: 'LocalNet — Partage de fichiers en réseau local',
        short_name: 'LocalNet',
        description: 'Partagez des fichiers entre appareils sur le même Wi-Fi, sans Internet.',
        lang: 'fr',
        theme_color: '#060b14',
        background_color: '#060b14',
        display: 'standalone',
        start_url: '/bibliotheque',
        scope: '/',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/ws$/],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && (url.pathname.startsWith('/api/') || url.pathname === '/ws'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ sameOrigin }) => sameOrigin,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'localnet-app-shell' },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-router')) return 'router'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react'
          if (id.includes('node_modules/lucide-react')) return 'icons'
          if (id.includes('node_modules/idb') || id.includes('node_modules/zustand')) return 'data'
        },
      },
    },
  },
})
