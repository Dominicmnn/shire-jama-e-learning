import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8000',
        '/media': 'http://127.0.0.1:8000',
      },
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || ''),
    },
  }
})
