/** Aligné sur backend/lib/CitySlug.php (slug SEO de ville). */
export function citySlugFrom(city: string): string {
  const trimmed = city.trim()
  if (!trimmed) return ''
  const ascii = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function countEditorialWords(article: { sections: Array<{ title: string; paragraphs: string[] }> }): number {
  const parts: string[] = []
  for (const section of article.sections) {
    parts.push(section.title)
    for (const paragraph of section.paragraphs) {
      parts.push(paragraph)
    }
  }
  const text = parts.join(' ').replace(/\s+/g, ' ').trim()
  if (!text) return 0
  return text.split(' ').filter(Boolean).length
}

/** Tirets de liste markdown et tirets cadratin / demi-cadratin interdits dans la prose SEO. */
export function findForbiddenSeoDashes(article: { sections: Array<{ title: string; paragraphs: string[] }>; faq?: Array<{ question: string; answer: string }> }): string[] {
  const hits: string[] = []
  const scan = (label: string, value: string) => {
    if (/[\u2013\u2014]/.test(value)) hits.push(`${label}: tiret cadratin ou demi-cadratin`)
    if (/(^|\n)\s*-\s+\S/.test(value)) hits.push(`${label}: liste à tiret`)
  }
  article.sections.forEach((section, i) => {
    scan(`section[${i}].title`, section.title)
    section.paragraphs.forEach((paragraph, j) => scan(`section[${i}].paragraphs[${j}]`, paragraph))
  })
  article.faq?.forEach((item, i) => {
    scan(`faq[${i}].question`, item.question)
    scan(`faq[${i}].answer`, item.answer)
  })
  return hits
}
