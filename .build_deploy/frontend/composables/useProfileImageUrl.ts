/**
 * Retourne l'URL complète pour afficher une photo de profil (profile_image_url).
 * Gère : URL absolue (http), chemin relatif (préfixé par apiBase ou origin).
 */
export function useProfileImageUrl() {
  const config = useRuntimeConfig()
  const apiBase = (config.public?.apiBase as string) || ''

  function profileImageUrl(url: string | null | undefined): string | undefined {
    if (!url || typeof url !== 'string') return undefined
    const trimmed = url.trim()
    if (!trimmed) return undefined
    // URL absolue ou data URL (comme en profil) : utiliser telle quelle
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) return trimmed
    // Chemin relatif : préfixer par l'origine du site (même domaine) ou apiBase
    if (trimmed.startsWith('/')) {
      if (apiBase && !apiBase.startsWith('http')) return `${apiBase.replace(/\/$/, '')}${trimmed}`
      if (typeof window !== 'undefined') return `${window.location.origin}${trimmed}`
      return trimmed
    }
    if (apiBase) return `${apiBase.replace(/\/$/, '')}/${trimmed}`
    return trimmed
  }

  return { profileImageUrl }
}
