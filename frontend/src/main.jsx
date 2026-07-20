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

// Route-level code splitting (App.jsx) means every page is a separate
// hashed chunk fetched on first navigation to it. If a deploy happens
// between when this tab loaded index.html and when the user first
// navigates to a not-yet-loaded route, that chunk's old filename no
// longer exists on the server — the request 404s (often as an HTML error/
// SPA-fallback page), the browser throws "'text/html' is not a valid
// JavaScript MIME type" trying to execute it as a module, and because this
// happens in the dynamic-import machinery (not inside a component's
// render call), a React error boundary can't catch it — the Suspense
// fallback is `null`, so the result is a blank white screen. Vite fires
// `vite:preloadError` specifically for this — the standard recovery is a
// one-time reload to fetch the current index.html + matching chunks.
// `reg.update()` first gives the service worker its best chance of having
// already picked up the latest deploy before that reload happens; the
// sessionStorage guard prevents a reload loop if the deploy is genuinely
// broken. Cleared on a normal successful load so a *future* deploy can
// still trigger one more recovery reload.
const CHUNK_RELOAD_GUARD_KEY = 'pos-chunk-reload-once';
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, '1');
  const reload = () => window.location.reload();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).finally(reload);
  } else {
    reload();
  }
});
window.addEventListener('load', () => sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY));

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
