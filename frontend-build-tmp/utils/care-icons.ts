import { careCategoryEmojiForCategory, isCareCategoryEmoji } from '@oneandlab/shared-utils'

/**
 * URL affichable pour une image de catégorie (`care_categories.image_url`, ex. `/api/categories/care-image?name=…`).
 * Avec `apiBase` relatif (`/api`), renvoie le chemin tel quel pour que le navigateur reste sur l’origine du front (proxy Nitro).
 */
export function resolveCareCategoryImageSrc(
  imageUrl: string | null | undefined,
  apiBase?: string | null,
): string | null {
  const raw = imageUrl != null && String(imageUrl).trim() !== '' ? String(imageUrl).trim() : '';
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const base = apiBase != null && String(apiBase).trim() !== '' ? String(apiBase).trim() : '';
  if (!base || base.startsWith('/')) {
    return path;
  }
  const origin = base.replace(/\/api\/?$/i, '').replace(/\/$/, '');
  return `${origin}${path}`;
}

/**
 * Mappe une entrée care_categories (icône BDD) vers un nom d’icône Nuxt UI (UIcon).
 */
export function resolveCareIconFromCategory(cat: { icon?: string | null; type: string }): string {
  const raw = cat.icon && String(cat.icon).trim()
  if (raw && isCareCategoryEmoji(raw)) {
    return cat.type === 'blood_test' ? 'i-lucide-droplet' : 'i-lucide-heart-pulse'
  }
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

export type CareCategoryBadgeVisual = {
  emoji: string
  iconName: string
  iconColor: string
  tileBg: string
  imageSrc: string | null
}

function careCategoryImageSrcForDisplay(
  imageUrl: string | null | undefined,
  icon: string | null | undefined,
  apiBase?: string | null,
): string | null {
  if (isCareCategoryEmoji(icon)) return null
  return resolveCareCategoryImageSrc(imageUrl, apiBase)
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

/** Ligne minimale `care_categories` (liste RDV, APIs compactes). */
export type CareCategoryRowMinimal = {
  id: string
  name?: string
  icon?: string | null
  /** Chemin API public vers l’image uploadée (si défini, remplace l’icône Lucide). */
  image_url?: string | null
  type?: string
}

/** Champs RDV utiles pour reconstruire tuile / badge comme RendezVousCareSelection + fiche détail. */
export type AppointmentCareBadgeInput = {
  type?: string | null
  category_id?: string | null
  category_icon?: string | null
  category_image_url?: string | null
  form_data?: { category_id?: string | null }
  blood_test_items?: Array<{ category_id?: string | null; category_image_url?: string | null }>
}

/**
 * Carte d’accents HSL pour une liste `/categories` (ou repli 2 entrées sans API).
 * Réutilisable pour ne pas recalculer la carte à chaque ligne RDV.
 */
export function buildCategoryAccentMapForList(
  categories: CareCategoryRowMinimal[],
): ReadonlyMap<string, CareAccent> {
  const sortedIds =
    categories.length > 0
      ? [...new Set(categories.map((c) => String(c.id)))].sort((x, y) => x.localeCompare(y, 'fr'))
      : [...new Set(['blood_test', 'nursing'])].sort((x, y) => x.localeCompare(y, 'fr'))
  return buildAccentMapForSortedIds(sortedIds)
}

/**
 * Icône + couleurs (fond / icône HSL) alignées sur `/rendez-vous/nouveau` et `AppointmentDetailRdvFieldRows`.
 * `categories` = réponse `/categories` (tri des ids identique à la grille de choix des soins).
 * Passer `accentMap` depuis un `computed` pour les listes (évite de reconstruire la carte par ligne).
 */
export function careListBadgeDisplay(
  apt: AppointmentCareBadgeInput | null | undefined,
  categories: CareCategoryRowMinimal[],
  accentMap?: ReadonlyMap<string, CareAccent>,
  apiBase?: string | null,
): CareCategoryBadgeVisual {
  const rawType = String(apt?.type ?? '')
  const typeStr = rawType === 'blood_test' ? 'blood_test' : 'nursing'
  const items = Array.isArray(apt?.blood_test_items) ? apt.blood_test_items : []

  let catId: string | null = null
  const topId = apt?.category_id
  const fdId = apt?.form_data?.category_id
  if (topId != null && String(topId).trim() !== '') catId = String(topId)
  else if (fdId != null && String(fdId).trim() !== '') catId = String(fdId)

  if (!catId && typeStr === 'blood_test' && items.length === 1) {
    const only = items[0]
    if (only?.category_id != null && String(only.category_id).trim() !== '') {
      catId = String(only.category_id)
    }
  }

  const map = accentMap ?? buildCategoryAccentMapForList(categories)
  const idStr = catId ?? ''

  let iconFromSource: string | null | undefined =
    apt?.category_icon != null && String(apt.category_icon).trim() !== ''
      ? String(apt.category_icon)
      : undefined

  let imageFromSource: string | null | undefined =
    apt?.category_image_url != null && String(apt.category_image_url).trim() !== ''
      ? String(apt.category_image_url)
      : undefined

  if (!catId && typeStr === 'blood_test' && items.length === 1) {
    const only = items[0]
    const img = only?.category_image_url
    if (img != null && String(img).trim() !== '') {
      imageFromSource = String(img)
    }
  }

  let accent = getAccentFallback()

  if (idStr) {
    accent = map.get(idStr) ?? getAccentFallback()
    const row = categories.find((c) => String(c.id) === idStr)
    iconFromSource = row?.icon != null && String(row.icon).trim() !== '' ? String(row.icon) : iconFromSource
    imageFromSource =
      row?.image_url != null && String(row.image_url).trim() !== ''
        ? String(row.image_url)
        : imageFromSource
  } else if (typeStr === 'blood_test' && items.length > 1) {
    const bloodIds = categories
      .filter((c) => c.type === 'blood_test')
      .map((c) => String(c.id))
      .sort((a, b) => a.localeCompare(b, 'fr'))
    if (bloodIds.length > 0) {
      accent = map.get(bloodIds[0]) ?? getAccentFallback()
    } else {
      accent = map.get('blood_test') ?? getAccentFallback()
    }
  } else if (categories.length === 0) {
    const typeKey = typeStr === 'blood_test' ? 'blood_test' : 'nursing'
    accent = map.get(typeKey) ?? getAccentFallback()
  }

  const categoryRow = idStr ? categories.find((c) => String(c.id) === idStr) : undefined

  const emoji = careCategoryEmojiForCategory({
    name: categoryRow?.name,
    icon: iconFromSource ?? null,
    type: typeStr,
  })

  const iconName = resolveCareIconFromCategory({
    icon: iconFromSource ?? null,
    type: typeStr,
  })

  const imageSrc = careCategoryImageSrcForDisplay(imageFromSource, iconFromSource, apiBase)

  return { emoji, iconName, iconColor: accent.iconColor, tileBg: accent.tileBg, imageSrc }
}

/**
 * Badge pour une ligne catalogue (prestation prise de sang ou soin) dans une liste — même rendu que la carte RDV globale.
 */
export function careListBadgeForCatalogItem(
  appointmentType: string | null | undefined,
  item: {
    category_id?: string | null
    category_image_url?: string | null
  } | null | undefined,
  categories: CareCategoryRowMinimal[],
  accentMap?: ReadonlyMap<string, CareAccent>,
  apiBase?: string | null,
): CareCategoryBadgeVisual {
  const rawType = String(appointmentType ?? '')
  const typeStr = rawType === 'blood_test' ? 'blood_test' : 'nursing'
  const map = accentMap ?? buildCategoryAccentMapForList(categories)

  let catId = ''
  if (item?.category_id != null && String(item.category_id).trim() !== '') {
    catId = String(item.category_id)
  }

  let iconFromSource: string | null | undefined
  let imageFromSource: string | null | undefined =
    item?.category_image_url != null && String(item.category_image_url).trim() !== ''
      ? String(item.category_image_url)
      : undefined

  let accent = getAccentFallback()

  if (catId) {
    accent = map.get(catId) ?? getAccentFallback()
    const row = categories.find((c) => String(c.id) === catId)
    iconFromSource = row?.icon != null && String(row.icon).trim() !== '' ? String(row.icon) : iconFromSource
    imageFromSource =
      row?.image_url != null && String(row.image_url).trim() !== ''
        ? String(row.image_url)
        : imageFromSource
  } else if (typeStr === 'blood_test') {
    const bloodIds = categories
      .filter((c) => c.type === 'blood_test')
      .map((c) => String(c.id))
      .sort((a, b) => a.localeCompare(b, 'fr'))
    accent = bloodIds.length > 0 ? map.get(bloodIds[0]) ?? getAccentFallback() : map.get('blood_test') ?? getAccentFallback()
  } else {
    const nurIds = categories
      .filter((c) => c.type === 'nursing' || c.type === 'nurse')
      .map((c) => String(c.id))
      .sort((a, b) => a.localeCompare(b, 'fr'))
    accent =
      nurIds.length > 0 ? map.get(nurIds[0]) ?? getAccentFallback() : map.get('nursing') ?? getAccentFallback()
  }

  const row = catId ? categories.find((c) => String(c.id) === catId) : undefined
  const emoji = careCategoryEmojiForCategory({
    name: row?.name,
    icon: iconFromSource ?? null,
    type: typeStr,
  })

  const iconName = resolveCareIconFromCategory({
    icon: iconFromSource ?? null,
    type: typeStr,
  })
  const imageSrc = careCategoryImageSrcForDisplay(imageFromSource, iconFromSource, apiBase)

  return { emoji, iconName, iconColor: accent.iconColor, tileBg: accent.tileBg, imageSrc }
}
