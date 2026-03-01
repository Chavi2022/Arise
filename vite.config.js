import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Arise',
        short_name: 'Arise',
        description: 'Earn your screen time through exercise.',
        display: 'standalone',
        background_color: '#080810',
        theme_color: '#7c3aed',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/AriseS.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/AriseS.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  server: {
    host: true, // listen on all addresses so you can open from your iPhone
    port: 5173,
  },
})
