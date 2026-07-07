/**
 * Custom service worker (injectManifest strategy via vite-plugin-pwa).
 *
 * Caching policy:
 *   - Precache the built app shell (JS/CSS/HTML) + static assets so the
 *     installed app opens instantly and works offline.
 *   - Cache-first for images/fonts (rarely change, safe to reuse).
 *   - NEVER cache anything under /api/ or /socket.io/ — auth, reports,
 *     inventory, transactions and realtime traffic must always hit the
 *     network so the POS never shows stale business data.
 *   - Offline navigation falls back to the cached app shell; if even that
 *     is unavailable (e.g. cache cleared, first-ever offline load), a
 *     static offline.html is served instead of a broken browser error page.
 */
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();

// Precache the Vite build manifest (hashed JS/CSS/HTML + icons/manifest copied from /public)
precacheAndRoute(self.__WB_MANIFEST);

// ── Never cache: API, auth, sockets, and any dynamic business data ─────────
registerRoute(({ url }) => url.pathname.startsWith('/api/'), new NetworkOnly());
registerRoute(({ url }) => url.pathname.startsWith('/socket.io/'), new NetworkOnly());

// ── Images: cache-first, small footprint, long-lived ───────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'pos-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60, purgeOnQuotaError: true }),
    ],
  })
);

// ── Fonts: cache-first, effectively static ──────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'pos-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 90 * 24 * 60 * 60, purgeOnQuotaError: true }),
    ],
  })
);

// ── Any same-origin JS/CSS not already precached: stale-while-revalidate ────
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new StaleWhileRevalidate({ cacheName: 'pos-static-resources' })
);

// ── SPA navigation fallback — serve the cached app shell when offline ──────
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [/^\/api\//, /^\/socket\.io\//],
  })
);

// ── Last-resort fallback — only reached if the app shell itself is missing
//    from cache (e.g. very first visit with no connectivity) ───────────────
setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    const offline = await caches.match('/offline.html');
    if (offline) return offline;
  }
  return Response.error();
});
