/**
 * Mappe une entrée care_categories (icône BDD) vers un nom d’icône Nuxt UI (UIcon).
 */
export function resolveCareIconFromCategory(cat: { icon?: string | null; type: string }): string {
  const raw = cat.icon && String(cat.icon).trim()
  if (raw) {
    if (raw.startsWith('medical-icon:')) return 'i-medical-icon-' + raw.slice('medical-icon:'.length)
    if (raw.startsWith('healthicons:')) return 'i-healthicons-' + raw.slice('healthicons:'.length)
    if (raw.startsWith('covid:')) return 'i-covid-' + raw.slice('covid:'.length)
    const name = raw.replace(/^i-lucide-/, '').replace(/^lucide:/, '').replace(/\s+/g, '-').toLowerCase()
    if (name) return `i-lucide-${name}`
  }
  return cat.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-heart-pulse'
}

/** Couleur par défaut si besoin (analyses vs domicile) */
export function defaultColorClassForCategory(type: string): string {
  return type === 'blood_test' ? 'text-red-500' : 'text-blue-600'
}

/** Couleur d’icône + fond de pastille (HSL, pas de doublon entre catégories du même écran) */
export type CareAccent = {
  iconColor: string
  tileBg: string
}

const ACCENT_FALLBACK: CareAccent = {
  iconColor: 'hsl(217 88% 52%)',
  tileBg: 'hsl(217 85% 96%)',
}

/**
 * Une teinte HSL distincte par rang : ids triés de façon stable, puis hue = i × 360 / n (réel, pas d’arrondi
 * qui pourrait fusionner deux rangs si n est grand). Aucune collision entre catégories distinctes.
 */
export function buildAccentMapForSortedIds(sortedUniqueIds: string[]): ReadonlyMap<string, CareAccent> {
  const n = Math.max(sortedUniqueIds.length, 1)
  const m = new Map<string, CareAccent>()
  sortedUniqueIds.forEach((id, i) => {
    const hue = (i * 360) / n
    m.set(id, {
      /** Icônes vives, fond pastel saturé (lisible, pas terne) */
      iconColor: `hsl(${hue} 78% 46%)`,
      tileBg: `hsl(${hue} 62% 94%)`,
    })
  })
  return m
}

export function getAccentFallback(): CareAccent {
  return ACCENT_FALLBACK
}

/** « Autre » toujours en dernier dans les listes triées */
export function isAutreCategoryLabel(label: string): boolean {
  const t = label.trim().toLowerCase()
  return t === 'autre' || t.startsWith('autre ')
}
