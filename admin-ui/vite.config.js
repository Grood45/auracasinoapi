import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/v1/admin/dashboard/',
    server: {
        proxy: {
            '/v1': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: '../src/public',
        emptyOutDir: true
    }
})
