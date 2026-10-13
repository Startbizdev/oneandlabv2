import type { SeoEditorialArticle } from '../../types'

const cityModules = import.meta.glob<{ default: SeoEditorialArticle }>('./*.ts', {
  eager: true,
})

export const nurseCityArticles: SeoEditorialArticle[] = Object.entries(cityModules)
  .filter(([path]) => !path.endsWith('/index.ts'))
  .map(([, mod]) => mod.default)
  .filter(Boolean)

export function getNurseCityArticle(slug: string): SeoEditorialArticle | null {
  const needle = slug.trim().toLowerCase()
  return (
    nurseCityArticles.find((article) => {
      const match = article.path.match(/^\/infirmier\/ville\/([^/]+)$/)
      return match?.[1]?.toLowerCase() === needle
    }) ?? null
  )
}

export function listNurseCitySlugs(): string[] {
  return nurseCityArticles
    .map((article) => article.path.match(/^\/infirmier\/ville\/([^/]+)$/)?.[1])
    .filter((slug): slug is string => Boolean(slug))
}
