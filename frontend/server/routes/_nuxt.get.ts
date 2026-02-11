/**
 * GET /_nuxt (sans slash) — évite l'erreur unhandled en dev.
 * Les vrais assets sont /_nuxt/<fichier>.js. On répond 204 pour ne pas déclencher createError.
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 204)
  return null
})
