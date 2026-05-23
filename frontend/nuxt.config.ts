export default defineNuxtConfig({
    ssr: true, // SSR activé pour les pages publiques
  
    compatibilityDate: '2024-11-01',
    devtools: { enabled: true },
    srcDir: '.',
  
    modules: ['@nuxt/ui'],
  
    css: ['~/assets/css/main.css', 'leaflet/dist/leaflet.css'],
  
    runtimeConfig: {
      public: {
        // En dev : /api pour passer par le proxy Nitro (évite CORS / connexion refusée)
        apiBase: process.env.NUXT_PUBLIC_API_BASE || (process.env.NODE_ENV === 'development' ? '/api' : 'http://localhost:8888/api'),
        siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://cary.fr',
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
              'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover',
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
  