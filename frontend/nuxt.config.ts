import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
    alias: Object.fromEntries(
      ['shared-api', 'shared-types', 'shared-utils', 'shared-constants', 'onboarding'].map((name) => [
        `@oneandlab/${name}`,
        fileURLToPath(new URL(`../packages/${name}/src/index.ts`, import.meta.url)),
      ]),
    ),
    ssr: true, // SSR activé pour les pages publiques
  
    compatibilityDate: '2024-11-01',
    devtools: { enabled: true },
    srcDir: '.',
  
    modules: ['@nuxt/ui'],

    build: {
      transpile: ['@oneandlab/onboarding'],
    },
  
    css: ['~/assets/css/main.css', 'leaflet/dist/leaflet.css'],
  
    runtimeConfig: {
      // PHP origin for SSR when the browser uses the relative /api endpoint.
      apiInternalBase: process.env.NUXT_API_INTERNAL_BASE || 'http://127.0.0.1:8888/api',
      public: {
        // En dev : /api pour passer par le proxy Nitro (évite CORS / connexion refusée)
        apiBase: process.env.NUXT_PUBLIC_API_BASE || (process.env.NODE_ENV === 'development' ? '/api' : 'https://cary.bio/api'),
        siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://cary.bio',
      },
    },

    nitro: {
      devProxy: {
        '/api': { target: 'http://localhost:8888', changeOrigin: true },
      },
    },
  
    colorMode: {
      preference: 'light',
      fallback: 'light',
    },

    // Icônes via CDN Iconify (api.iconify.design) — pas de route serveur, pas de conflit avec /api
    icon: {
      provider: 'iconify',
      // Core navigation and booking icons remain available without a CDN round trip.
      clientBundle: {
        icons: ['lucide:droplet', 'lucide:syringe', 'lucide:bandage', 'lucide:heart-pulse', 'lucide:shower-head', 'lucide:stethoscope'],
        scan: { globInclude: ['layouts/*.vue', 'components/shell/*.vue', 'components/rendez-vous/RendezVousCareSelection.vue'] },
      },
    },
  
    components: {
      dirs: [
        {
          path: '~/components',
          pathPrefix: false,
        },
      ],
    },
  
    vue: {
      compilerOptions: {
        isCustomElement: (tag) => false,
      },
    },
  
    experimental: {
      payloadExtraction: false,
    },
  
    vite: {
      server: {
        fs: {
          allow: ['../../public'],
        },
      },
    },
  
    app: {
      head: {
        title: 'Cary - Prélèvement et soins infirmiers à domicile',
        meta: [
          { charset: 'utf-8' },
          {
            name: 'viewport',
            content:
              'width=device-width, initial-scale=1, viewport-fit=cover',
          },
          { name: 'description', content: 'Plateforme Cary : rendez-vous médicaux et soins à domicile' },
        ],
        link: [
          { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
          { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
          { rel: 'shortcut icon', href: '/favicon.ico' },
          { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
          { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/android-chrome-192x192.png' },
          { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/android-chrome-512x512.png' },
          { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
          { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
          { rel: 'preconnect', href: 'https://api.iconify.design', crossorigin: '' },
          { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Raleway:ital,wght@0,300..900;1,300..900&display=swap' },
        ],
      },
    },
  })
