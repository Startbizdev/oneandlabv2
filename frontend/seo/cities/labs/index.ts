import type { SeoEditorialArticle } from '../../types'

const cityModules = import.meta.glob<{ default: SeoEditorialArticle }>('./*.ts', {
  eager: true,
})

export const labCityArticles: SeoEditorialArticle[] = Object.entries(cityModules)
  .filter(([path]) => !path.endsWith('/index.ts'))
  .map(([, mod]) => mod.default)
  .filter(Boolean)

export function getLabCityArticle(slug: string): SeoEditorialArticle | null {
  const needle = slug.trim().toLowerCase()
  return (
    labCityArticles.find((article) => {
      const match = article.path.match(/^\/laboratoire\/ville\/([^/]+)$/)
      return match?.[1]?.toLowerCase() === needle
    }) ?? null
  )
}

export function listLabCitySlugs(): string[] {
  return labCityArticles
    .map((article) => article.path.match(/^\/laboratoire\/ville\/([^/]+)$/)?.[1])
    .filter((slug): slug is string => Boolean(slug))
}
