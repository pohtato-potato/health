import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

const shortcut = (name: string, url: string, icon: string) => ({
  name,
  short_name: name,
  url,
  icons: [{ src: `icons/sc-${icon}.png`, sizes: '96x96', type: 'image/png' }],
});

export default defineConfig({
  // Relative paths, so the same build works at any address or sub-folder.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Health',
        short_name: 'Health',
        description: 'Food, steps, sleep, training and body in one calm place. Everything stays on this phone.',
        start_url: './#/today',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0D0F14',
        theme_color: '#0D0F14',
        categories: ['health', 'fitness', 'lifestyle'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          shortcut('Morning log', './#/today?sheet=morning', 'morning'),
          shortcut('Add food', './#/today?sheet=addfood', 'food'),
          shortcut('Water +250 ml', './#/today?do=water', 'water'),
          shortcut('Start session', './#/session?start=next', 'session'),
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/*vietnamese*'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 800 },
  server: {
    port: 5173,
    // The private folder holds the starter file; never serve it.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/private/**'] },
  },
  preview: { port: 4173 },
});
