import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// DEPLOY_BASE 由部署工作流注入（GitHub Pages 项目页需要 /bugua/ 前缀）
export default defineConfig({
  base: process.env.DEPLOY_BASE ?? '/',
  plugins: [react()],
})
