import { appleAppSiteAssociation } from './config'

/** GET /.well-known/apple-app-site-association (et /apple-app-site-association). 404 sans Team ID. */
export default defineEventHandler((event) => {
  const body = appleAppSiteAssociation(String(useRuntimeConfig(event).appleTeamId ?? ''))
  if (!body) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return JSON.stringify(body)
})
