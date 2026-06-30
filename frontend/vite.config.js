import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(env.VITE_CLERK_PUBLISHABLE_KEY),
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api': 'http://127.0.0.1:5001',
        '/socket.io': {
          target: 'http://127.0.0.1:5001',
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
})
