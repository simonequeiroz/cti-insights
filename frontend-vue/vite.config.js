import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  server: {
    // Sempre na 5173: é a única porta que o Spring aceita em desenvolvimento
    // (CORS_ALLOWED_ORIGINS). Se ela estiver ocupada, o Vite para com o aviso
    // "Port 5173 is already in use", em vez de pular para a 5174 em silêncio.
    port: 5173,
    strictPort: true,
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