import { describe, expect, it } from 'vitest'
import { countEditorialWords, findForbiddenSeoDashes } from '../../seo/citySlug'
import { seoStaticPages } from '../../seo/pages'
import { nurseCityArticles } from '../../seo/cities/nurses'
import { labCityArticles } from '../../seo/cities/labs'
import type { SeoEditorialArticle } from '../../seo/types'

const MIN_WORDS = 1400

function assertArticle(article: SeoEditorialArticle) {
  expect(article.path.startsWith('/')).toBe(true)
  expect(article.title.length).toBeGreaterThan(10)
  expect(article.description.length).toBeGreaterThan(40)
  expect(article.sections.length).toBeGreaterThanOrEqual(4)
  const words = countEditorialWords(article)
  expect(words, `${article.path} has ${words} words`).toBeGreaterThanOrEqual(MIN_WORDS)
  expect(findForbiddenSeoDashes(article), `${article.path} forbidden dashes`).toEqual([])
}

describe('seo editorial inventory', () => {
  it('static pages that exist each meet word and dash rules', () => {
    for (const article of seoStaticPages) {
      assertArticle(article)
    }
  })

  it('nurse city articles each meet word and dash rules', () => {
    for (const article of nurseCityArticles) {
      assertArticle(article)
      expect(article.path).toMatch(/^\/infirmier\/ville\/[a-z0-9-]+$/)
      expect(article.areaServed).toBeTruthy()
    }
  })

  it('lab city articles each meet word and dash rules', () => {
    for (const article of labCityArticles) {
      assertArticle(article)
      expect(article.path).toMatch(/^\/laboratoire\/ville\/[a-z0-9-]+$/)
      expect(article.areaServed).toBeTruthy()
    }
  })

  it('article paths are unique across the inventory', () => {
    const paths = [
      ...seoStaticPages.map((a) => a.path),
      ...nurseCityArticles.map((a) => a.path),
      ...labCityArticles.map((a) => a.path),
    ]
    expect(new Set(paths).size).toBe(paths.length)
  })
})
