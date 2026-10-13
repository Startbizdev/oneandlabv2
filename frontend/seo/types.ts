export type SeoFaqItem = {
  question: string
  answer: string
  sourceUrl?: string
  sourceLabel?: string
}

export type SeoEditorialSection = {
  title: string
  paragraphs: string[]
}

/** Article éditorial SEO rédigé à la main (une URL = un fichier). */
export type SeoEditorialArticle = {
  path: string
  title: string
  description: string
  keywords?: string
  sections: SeoEditorialSection[]
  faq?: SeoFaqItem[]
  /** Fil d’Ariane hors page courante (name + path). */
  breadcrumbs?: Array<{ name: string; path: string }>
  /** Ville desservie pour schema MedicalBusiness / areaServed. */
  areaServed?: string
}
