var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // VITE_TARGET=web builds the multi-user website; anything else is the local-first native app.
    var env = __assign(__assign({}, loadEnv(mode, process.cwd(), 'VITE_')), process.env);
    var isWeb = env.VITE_TARGET === 'web';
    return {
        resolve: {
            alias: {
                // The API implementation behind src/api/client.ts (see src/api/contract.ts)
                '@api-impl': fileURLToPath(new URL("./src/api/".concat(isWeb ? 'remote' : 'local', ".ts"), import.meta.url)),
            },
        },
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                // The native app manages its own bundle (and OTA updates); do not
                // auto-register a service worker there. The website registers one as before.
                injectRegister: isWeb ? 'auto' : false,
                devOptions: { enabled: false },
                includeAssets: ['favicon.svg', 'favicon-48.png', 'favicon-192.png', 'favicon-512.png'],
                manifest: {
                    name: 'GrindLogger',
                    short_name: 'GrindLogger',
                    description: 'Track your workouts and get AI-powered coaching',
                    theme_color: '#FF6B1A',
                    background_color: '#0A0908',
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
    };
});
