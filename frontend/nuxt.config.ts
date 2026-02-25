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
        siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://oneandlab.com',
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
        title: 'OneAndLab - Prise de sang et soins infirmiers à domicile',
        meta: [
          { charset: 'utf-8' },
          { name: 'viewport', content: 'width=device-width, initial-scale=1' },
          { name: 'description', content: 'Plateforme de gestion de rendez-vous médicaux à domicile' },
        ],
        link: [
          { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
          { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
          { rel: 'preconnect', href: 'https://api.iconify.design', crossorigin: '' },
          { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap' },
        ],
      },
    },
  })
  