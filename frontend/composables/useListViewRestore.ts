/**
 * Persistance session (filtres, page, scroll) pour retrouver la liste après un détail.
 * Scroll cible le conteneur `.dashboard-main-scroll` du layout dashboard.
 */
export type ListViewRestorePayload = {
  scrollTop: number
  state: Record<string, unknown>
  viewedId?: string
}

function scrollContainer(): HTMLElement | null {
  if (!import.meta.client) return null
  return document.querySelector('.dashboard-main-scroll')
}

export function useListViewRestore(storageKey: string) {
  const flagKey = `oneandlab:list-restore:${storageKey}:flag`
  const dataKey = `oneandlab:list-restore:${storageKey}:data`

  function markForRestore(payload: ListViewRestorePayload) {
    if (!import.meta.client) return
    try {
      sessionStorage.setItem(flagKey, '1')
      sessionStorage.setItem(dataKey, JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }

  function consumeRestore(): ListViewRestorePayload | null {
    if (!import.meta.client) return null
    try {
      if (sessionStorage.getItem(flagKey) !== '1') return null
      sessionStorage.removeItem(flagKey)
      const raw = sessionStorage.getItem(dataKey)
      sessionStorage.removeItem(dataKey)
      if (!raw) return null
      const parsed = JSON.parse(raw) as ListViewRestorePayload
      if (!parsed || typeof parsed.scrollTop !== 'number') return null
      return parsed
    } catch {
      return null
    }
  }

  function captureScrollTop(): number {
    const el = scrollContainer()
    return el?.scrollTop ?? 0
  }

  async function restoreScrollTop(scrollTop: number) {
    if (!import.meta.client || scrollTop <= 0) return
    await nextTick()
    requestAnimationFrame(() => {
      const el = scrollContainer()
      if (el) el.scrollTop = scrollTop
    })
  }

  function prepareDetailNavigation(state: Record<string, unknown>, viewedId?: string) {
    markForRestore({
      scrollTop: captureScrollTop(),
      state,
      viewedId,
    })
  }

  return {
    markForRestore,
    consumeRestore,
    captureScrollTop,
    restoreScrollTop,
    prepareDetailNavigation,
  }
}
