import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5080',
      '/health': 'http://localhost:5080',
      '/uploads': 'http://localhost:5080',
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      includeAssets: ['favicon.svg', 'icons.svg', 'app-icon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'T-Expense',
        short_name: 'T-Expense',
        description: 'Personal expense tracker',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        shortcuts: [
          {
            name: 'Ghi sổ nhanh',
            short_name: 'Ghi sổ',
            description: 'Mở nhanh form nhập khoản chi',
            url: '/?quick=true',
            icons: [{ src: 'app-icon.svg', sizes: 'any' }]
          },
          {
            name: 'Chụp hóa đơn',
            short_name: 'Chụp bill',
            description: 'Mở camera chụp hóa đơn',
            url: '/snaps',
            icons: [{ src: 'app-icon.svg', sizes: 'any' }]
          }
        ],
        icons: [
          {
            src: 'app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'apple-touch-icon.svg',
            sizes: '180x180',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
})
