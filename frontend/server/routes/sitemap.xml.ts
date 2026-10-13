import { listSeoStaticPaths } from '../../seo/pages'
import { listNurseCitySlugs } from '../../seo/cities/nurses'
import { listLabCitySlugs } from '../../seo/cities/labs'

type DirectoryCity = { city: string; slug: string; count: number }

async function fetchDirectoryCities(kind: 'nurses' | 'labs'): Promise<DirectoryCity[]> {
  const config = useRuntimeConfig()
  const base = String(config.apiInternalBase || 'http://127.0.0.1:8888/api').replace(/\/$/, '')
  try {
    const response = await $fetch<{ success?: boolean; data?: DirectoryCity[] }>(`${base}/public/directory-cities`, {
      query: { kind },
      timeout: 8000,
    })
    if (!response?.success || !Array.isArray(response.data)) return []
    return response.data.filter((row) => row.count > 0 && row.slug)
  } catch {
    return []
  }
}

export default defineEventHandler(async (event) => {
  const origin = String(useRuntimeConfig(event).public.siteUrl || 'https://cary.bio').replace(/\/$/, '')
  const escapeXml = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const staticFromArticles = listSeoStaticPaths()
  const fallbackStatic = [
    '/',
    '/prise-de-sang-a-domicile',
    '/soins-infirmiers-a-domicile',
    '/infirmiers',
    '/laboratoires',
    '/pour-les-patients',
    '/pour-les-infirmiers',
    '/pour-les-infirmiers/tarifs',
    '/pour-les-laboratoires',
    '/pour-les-laboratoires/tarifs',
    '/pour-les-professionnels',
    '/mentions-legales',
    '/cgv',
    '/politique-confidentialite',
  ]
  const staticPaths = Array.from(new Set([...fallbackStatic, ...staticFromArticles]))

  const nurseArticleSlugs = new Set(listNurseCitySlugs())
  const labArticleSlugs = new Set(listLabCitySlugs())
  const [nurseCities, labCities] = await Promise.all([
    fetchDirectoryCities('nurses'),
    fetchDirectoryCities('labs'),
  ])

  const cityPaths = [
    ...nurseCities
      .filter((city) => nurseArticleSlugs.has(city.slug))
      .map((city) => `/infirmier/ville/${encodeURIComponent(city.slug)}`),
    ...labCities
      .filter((city) => labArticleSlugs.has(city.slug))
      .map((city) => `/laboratoire/ville/${encodeURIComponent(city.slug)}`),
  ]

  const paths = Array.from(new Set([...staticPaths, ...cityPaths]))
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths
    .map((path) => `<url><loc>${escapeXml(origin + path)}</loc></url>`)
    .join('')}</urlset>`
})
