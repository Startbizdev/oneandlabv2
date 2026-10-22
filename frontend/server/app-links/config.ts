/** Fichiers d'association app ↔ site (liens universels iOS, App Links Android). */

export const APP_BUNDLE_ID = 'com.carybioapp.app'
export const APP_LINK_PATHS = ['/qr/*', '/pharmacie/*', '/p/rdv/*']

export function appleAppSiteAssociation(teamId: string): Record<string, unknown> | null {
  const team = teamId.trim()
  if (!/^[A-Z0-9]{10}$/.test(team)) return null
  return {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [`${team}.${APP_BUNDLE_ID}`],
          components: APP_LINK_PATHS.map((path) => ({ '/': path })),
        },
      ],
    },
  }
}

export function parseSha256Fingerprints(raw: unknown): string[] {
  const values = Array.isArray(raw) ? raw : String(raw ?? '').split(',')
  return values
    .map((value) => String(value).trim().toUpperCase())
    .filter((value) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))
}

export function androidAssetLinks(fingerprints: string[]): Array<Record<string, unknown>> | null {
  if (fingerprints.length === 0) return null
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: APP_BUNDLE_ID,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]
}
