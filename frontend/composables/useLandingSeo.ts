import type { SeoEditorialArticle, SeoFaqItem } from '~/seo/types'

const SITE_NAME = 'Cary'
const FALLBACK_ORIGIN = 'https://cary.bio'
const DEFAULT_OG_IMAGE = '/android-chrome-512x512.png'

function siteOrigin(): string {
  const config = useRuntimeConfig()
  const publicConfig = config.public as { siteUrl?: string }
  let origin = publicConfig?.siteUrl ?? ''
  if (!origin) origin = FALLBACK_ORIGIN
  return origin.replace(/\/$/, '')
}

function absoluteUrl(path: string, origin: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const fullPath = path.startsWith('/') ? path : `/${path}`
  return `${origin}${fullPath}`
}

export function useLandingSeo(options: {
  title: string
  description: string
  keywords?: string
  path: string
  ogImage?: string
  breadcrumbs?: Array<{ name: string; path: string }>
  areaServed?: string
  faq?: SeoFaqItem[]
  medicalBusiness?: boolean
  robots?: string
}) {
  const origin = siteOrigin()
  const fullPath = options.path.startsWith('/') ? options.path : `/${options.path}`
  const canonicalUrl = `${origin}${fullPath}`
  const ogImageUrl = absoluteUrl(options.ogImage || DEFAULT_OG_IMAGE, origin)

  const organization = {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: SITE_NAME,
    url: origin,
    logo: absoluteUrl('/images/logo-cary.png', origin),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'contact@cary.bio',
      availableLanguage: ['French'],
    },
  }

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      name: options.title,
      description: options.description,
      url: canonicalUrl,
      isPartOf: { '@id': `${origin}/#website` },
      publisher: { '@id': `${origin}/#organization` },
      ...(options.areaServed
        ? { about: { '@type': 'Place', name: options.areaServed } }
        : {}),
    },
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: SITE_NAME,
      url: origin,
      publisher: { '@id': `${origin}/#organization` },
    },
    organization,
  ]

  if (options.breadcrumbs?.length) {
    const crumbs = [
      ...options.breadcrumbs,
      { name: options.title, path: fullPath },
    ]
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: absoluteUrl(crumb.path, origin),
      })),
    })
  }

  if (options.medicalBusiness && options.areaServed) {
    graph.push({
      '@type': 'MedicalBusiness',
      name: `${SITE_NAME} ${options.areaServed}`,
      url: canonicalUrl,
      areaServed: { '@type': 'City', name: options.areaServed },
      parentOrganization: { '@id': `${origin}/#organization` },
    })
  }

  if (options.faq?.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: options.faq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    })
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': graph,
  }

  useHead({
    title: options.title,
    meta: [
      { name: 'description', content: options.description },
      ...(options.keywords ? [{ name: 'keywords', content: options.keywords }] : []),
      ...(options.robots ? [{ name: 'robots', content: options.robots }] : []),
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: options.title },
      { property: 'og:description', content: options.description },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:image', content: ogImageUrl },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: options.title },
      { name: 'twitter:description', content: options.description },
      { name: 'twitter:image', content: ogImageUrl },
    ],
    link: [{ rel: 'canonical', href: canonicalUrl }],
    script: [
      {
        type: 'application/ld+json',
        key: 'landing-webpage',
        textContent: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      },
    ],
  })
}

/** Applique title/description/schema depuis un article éditorial rédigé. */
export function useSeoEditorialPage(article: SeoEditorialArticle, extras?: {
  medicalBusiness?: boolean
  robots?: string
}) {
  useLandingSeo({
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    path: article.path,
    breadcrumbs: article.breadcrumbs,
    areaServed: article.areaServed,
    faq: article.faq,
    medicalBusiness: extras?.medicalBusiness ?? Boolean(article.areaServed),
    robots: extras?.robots,
  })
}
