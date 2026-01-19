import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: ['portland-ocds.wegov.nyc'],
    proxy: {
      '/api/2.4': {
        target: 'https://portland-ocds.wegov.nyc',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
