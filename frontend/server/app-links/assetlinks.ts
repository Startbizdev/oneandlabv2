import { androidAssetLinks, parseSha256Fingerprints } from './config'

/** GET /.well-known/assetlinks.json. 404 sans empreinte de certificat Android. */
export default defineEventHandler((event) => {
  const body = androidAssetLinks(parseSha256Fingerprints(useRuntimeConfig(event).androidSha256Fingerprints))
  if (!body) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  setResponseHeader(event, 'Content-Type', 'application/json')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return JSON.stringify(body)
})
