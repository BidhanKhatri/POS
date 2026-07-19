import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ThemeProvider from './theme/ThemeProvider'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoadingProvider } from './context/LoadingContext.jsx'
import { registerSW } from 'virtual:pwa-register'

// `100dvh` alone isn't reliably correct on every mobile/installed-PWA
// WebView — support and cold-launch timing both vary. `window.visualViewport`
// is the browser's own continuously-updated, authoritative source of the
// real visible viewport height, immune to those quirks by design (it's the
// API built specifically to solve this class of problem). Mirror it into a
// CSS custom property, kept live for the whole app lifetime (covers
// orientation changes, on-screen keyboard, and any PWA chrome changes) —
// full-height layout wrappers use `var(--app-100vh, 100dvh)` so they always
// match the true screen instead of trusting `dvh` alone. Runs before React
// mounts so the variable is already correct on the very first paint.
function setAppViewportHeightVar() {
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-100vh', `${h}px`);
}
setAppViewportHeightVar();
window.visualViewport?.addEventListener('resize', setAppViewportHeightVar);
window.addEventListener('orientationchange', setAppViewportHeightVar);

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
