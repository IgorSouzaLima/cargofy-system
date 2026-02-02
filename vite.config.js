import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Aumentamos o limite para 2000kb para acomodar as bibliotecas de ícones e Firebase
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Estratégia de divisão de código para otimizar o carregamento
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
})
