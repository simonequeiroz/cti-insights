import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    // Encaminha /api para o back-end (Spring Boot) em desenvolvimento,
    // evitando CORS. Só é usado com VITE_USE_MOCK=false. A porta 8080 é o
    // padrão do Spring Boot — ajuste se a squad de Java usar outra.
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})