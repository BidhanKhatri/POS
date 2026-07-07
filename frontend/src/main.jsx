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
//
// The browser only checks sw.js for byte-level changes on its own schedule
// (roughly once every 24h, or on a hard navigation) — that's too slow for
// "I just deployed, why don't I see it yet?" on an installed app that's
// mostly foregrounded/backgrounded rather than fully reloaded. So actively
// ask for an update check whenever the app comes back to the foreground,
// plus on an interval while it stays open. This only makes a *newer* SW
// available sooner for the *next* launch/reload — it does not interrupt
// the current session or force a refresh.
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })

  const checkForUpdate = () => {
    navigator.serviceWorker.getRegistration().then((reg) => reg?.update())
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
  })
  window.addEventListener('focus', checkForUpdate)
  setInterval(checkForUpdate, 60 * 60 * 1000) // hourly safety net while the app stays open
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
