import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 字体自托管（unicode-range 分片，浏览器按页面用字按需加载，不依赖外网）
import '@fontsource/ma-shan-zheng/index.css'
import '@fontsource/zcool-xiaowei/index.css'
import '@fontsource/noto-serif-sc/300.css'
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/600.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
