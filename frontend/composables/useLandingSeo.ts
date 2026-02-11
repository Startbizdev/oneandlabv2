const SITE_NAME = 'OneAndLab'
const FALLBACK_ORIGIN = 'https://oneandlab.com'

export function useLandingSeo(options: {
  title: string
  description: string
  keywords: string
  path: string
}) {
  const config = useRuntimeConfig()
  const publicConfig = config.public as { siteUrl?: string }
  let origin = publicConfig?.siteUrl ?? ''
  if (!origin && typeof window !== 'undefined') {
    origin = window.location.origin
  }
  if (!origin) {
    origin = FALLBACK_ORIGIN
  }
  const fullPath = options.path.startsWith('/') ? options.path : `/${options.path}`
  const canonicalUrl = `${origin}${fullPath}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: options.title,
    description: options.description,
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: origin,
    },
  }

  useHead({
    title: options.title,
    meta: [
      { name: 'description', content: options.description },
      { name: 'keywords', content: options.keywords },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: options.title },
      { property: 'og:description', content: options.description },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:site_name', content: SITE_NAME },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: options.title },
      { name: 'twitter:description', content: options.description },
    ],
    link: [{ rel: 'canonical', href: canonicalUrl }],
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(jsonLd),
      },
    ],
  })
}
