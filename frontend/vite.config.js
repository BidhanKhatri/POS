import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Converts Vite's injected render-blocking `<link rel="stylesheet">` into the
// standard async "preload -> swap" pattern, so the app's CSS never delays
// first paint. This matters most on a cold PWA launch (iOS home-screen tap,
// no service worker cache yet): the static boot splash in index.html is
// fully self-styled via an inline <style> block, so it paints instantly
// regardless — but browsers hold ALL body rendering until every blocking
// stylesheet finishes loading, so without this the splash itself was stuck
// behind a full network round-trip for the ~40KB app CSS bundle. The actual
// stylesheet still loads immediately in parallel (via the preload), it just
// no longer blocks paint; React almost always finishes mounting after it
// anyway, so there's no visible unstyled flash in practice.
function deferRenderBlockingCss() {
  return {
    name: 'defer-render-blocking-css',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
        (_match, href) =>
          `<link rel="preload" as="style" crossorigin href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
          `<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      deferRenderBlockingCss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        injectManifest: {
          // App code + hashed build assets only — API/socket traffic is
          // never part of the build output so it can never end up here.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff,woff2}'],
          // Main JS bundle is a few MB (POS terminal + reporting + charts);
          // raise the default 2 MiB precache ceiling so it's still installed
          // for offline use instead of silently skipped.
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        },
        registerType: 'autoUpdate',
        injectRegister: false, // we call registerSW() ourselves in main.jsx
        devOptions: {
          enabled: false, // avoid SW/caching surprises during `npm run dev`
        },
        manifest: {
          id: '/',
          name: 'POS — Point of Sale',
          short_name: 'POS',
          description: 'POS — mobile-first point of sale system for staff and managers.',
          lang: 'en',
          dir: 'ltr',
          display: 'standalone',
          display_override: ['standalone', 'fullscreen', 'minimal-ui'],
          orientation: 'portrait',
          theme_color: '#3E2723',
          background_color: '#F5F3F1',
          start_url: '/',
          scope: '/',
          categories: ['business', 'finance', 'productivity'],
          icons: [
            { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            {
              name: 'New Sale',
              short_name: 'Sale',
              description: 'Jump straight to the terminal to ring up a sale',
              url: '/employee/terminal',
              icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Dashboard',
              short_name: 'Dashboard',
              description: 'Open the manager dashboard',
              url: '/manager/dashboard',
              icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(env.VITE_CLERK_PUBLISHABLE_KEY),
    },
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
      proxy: {
        '/api': 'http://127.0.0.1:5002',
        '/socket.io': {
          target: 'http://127.0.0.1:5002',
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
})
