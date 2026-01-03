import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002, // Set frontend to 3002 to avoid conflict with Engine (3000) and Bridge (3001)
  },
})