import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 개발 중 /api 요청을 Spring Boot로 전달 (같은 출처가 되어 CORS 설정 불필요)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
