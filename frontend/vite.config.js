import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    },
    // 确保环境变量被正确替换
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
      'import.meta.env.VITE_AZURE_AD_CLIENT_ID': JSON.stringify(env.VITE_AZURE_AD_CLIENT_ID),
      'import.meta.env.VITE_AZURE_AD_TENANT_ID': JSON.stringify(env.VITE_AZURE_AD_TENANT_ID),
      'import.meta.env.VITE_AZURE_AD_API_CLIENT_ID': JSON.stringify(env.VITE_AZURE_AD_API_CLIENT_ID),
      'import.meta.env.VITE_REDIRECT_URI': JSON.stringify(env.VITE_REDIRECT_URI),
      'import.meta.env.VITE_SHORT_URL_DOMAIN': JSON.stringify(env.VITE_SHORT_URL_DOMAIN)
    }
  }
})
