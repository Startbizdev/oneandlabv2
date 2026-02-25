/**
 * Évite l'erreur unhandled [GET] /_nuxt/ (404) en dev.
 * Certains clients demandent /_nuxt/ avec trailing slash ; on répond 204 pour ne pas déclencher createError.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (event.method === 'GET' && (path === '/_nuxt' || path === '/_nuxt/')) {
    setResponseStatus(event, 204)
    return null
  }
})
