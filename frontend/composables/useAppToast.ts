/**
 * Toast unique à l'échelle de la plateforme :
 * - Déduplication : même titre + description dans les 700 ms = un seul toast
 * - Durée par défaut cohérente (4 s) pour une meilleure UX
 * Utiliser useAppToast() partout à la place de useToast() pour éviter les doubles toasts.
 */
const DEDUPE_MS = 700
const DEFAULT_TIMEOUT = 4000

let lastKey = ''
let lastTime = 0

export function useAppToast() {
  const toast = useToast()

  function add(options: Parameters<typeof toast.add>[0]) {
    const title = options?.title ?? ''
    const description = typeof options?.description === 'string' ? options.description : ''
    const key = `${String(title)}|${description}`
    const now = Date.now()
    if (lastKey === key && now - lastTime < DEDUPE_MS) {
      return
    }
    lastKey = key
    lastTime = now
    const opts = {
      ...options,
      timeout: options?.timeout ?? DEFAULT_TIMEOUT,
    }
    return toast.add(opts)
  }

  return {
    ...toast,
    add,
  }
}
