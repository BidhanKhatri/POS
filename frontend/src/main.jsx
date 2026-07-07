import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ThemeProvider from './theme/ThemeProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoadingProvider } from './context/LoadingContext.jsx'
import { registerSW } from 'virtual:pwa-register'

// Register the service worker. registerType:'autoUpdate' + skipWaiting/clientsClaim
// in sw.js mean new versions take over silently — no forced reload of the
// current session, no update prompts interrupting an in-progress sale.
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:  5 * 60 * 1000,
      gcTime:     10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <LoadingProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </LoadingProvider>,
)
