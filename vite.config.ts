/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base: './' makes every link relative, so the same build works at
// https://<you>.github.io/<repo>/ and on Netlify without changes.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      // The service worker caches the whole app so it opens with no signal.
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: 'Gym Companion',
        short_name: 'Gym',
        description: 'Offline gym tracker',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,mp3}'],
        navigateFallback: 'index.html',
        // Small extra script: tapping a reminder notification opens the app.
        importScripts: ['sw-extra.js'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
