/**
 * GET /_nuxt/ (trailing slash) — évite l'erreur unhandled en dev.
 * Répond 204 pour ne pas déclencher createError côté serveur de dev.
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 204)
  return null
})
