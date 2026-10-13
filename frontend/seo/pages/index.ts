import type { SeoEditorialArticle } from '../types'

/**
 * Registre des articles marketing rédigés.
 * Chaque page importe son module et s’enregistre ici une fois le fichier créé.
 */
const pageModules = import.meta.glob<{ default: SeoEditorialArticle }>('./*.ts', {
  eager: true,
})

export const seoStaticPages: SeoEditorialArticle[] = Object.entries(pageModules)
  .filter(([path]) => !path.endsWith('/index.ts'))
  .map(([, mod]) => mod.default)
  .filter(Boolean)

export function getSeoStaticPage(path: string): SeoEditorialArticle | null {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return seoStaticPages.find((page) => page.path === normalized) ?? null
}

export function listSeoStaticPaths(): string[] {
  return seoStaticPages.map((page) => page.path)
}
