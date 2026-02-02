import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Ajusta o limite de aviso de tamanho de chunk para 1000kb
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Organiza as bibliotecas externas em chunks separados para melhor performance
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
