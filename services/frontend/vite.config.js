import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            // The native app manages its own bundle (and OTA updates); do not
            // auto-register a service worker. The web manifest is still emitted.
            injectRegister: false,
            devOptions: { enabled: false },
            includeAssets: ['favicon.svg', 'favicon-48.png', 'favicon-192.png', 'favicon-512.png'],
            manifest: {
                name: 'GrindLogger',
                short_name: 'GrindLogger',
                description: 'Track your workouts and get AI-powered coaching',
                theme_color: '#f97316',
                background_color: '#0a0a0f',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                icons: [
                    {
                        src: 'favicon-48.png',
                        sizes: '48x48',
                        type: 'image/png',
                    },
                    {
                        src: 'favicon-192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'favicon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'favicon-maskable-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                skipWaiting: true,
                clientsClaim: true,
                cleanupOutdatedCaches: true,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                            cacheableResponse: { statuses: [0, 200] },
                        },
                    },
                ],
            },
        }),
    ],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api/, ''); },
            },
            '/ai-coach': {
                target: 'http://localhost:8001',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/ai-coach/, ''); },
            },
        },
    },
});
