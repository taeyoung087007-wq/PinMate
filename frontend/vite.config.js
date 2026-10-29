import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 카카오 지도 도메인 등록이 localhost:5173 기준이라 포트가 바뀌면 지도가 안 뜬다.
    // 5173이 이미 사용 중이면 조용히 5174로 옮기지 말고 바로 실패시킨다.
    port: 5173,
    strictPort: true,
    // 개발 중 /api 요청을 Spring Boot로 전달 (같은 출처가 되어 CORS 설정 불필요)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
