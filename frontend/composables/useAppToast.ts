/**
 * Toast unique à l'échelle de la plateforme :
 * - Déduplication : même titre + description dans les 700 ms = un seul toast
 * - Durée par défaut cohérente (4 s) pour une meilleure UX
 * Utiliser useAppToast() partout à la place de useToast() pour éviter les doubles toasts.
 */
const DEDUPE_MS = 700
const DEFAULT_TIMEOUT = 2800

let lastKey = ''
let lastTime = 0

export function useAppToast() {
  const toast = useToast()
  type NativeOptions = Parameters<typeof toast.add>[0]
  type LegacyColor = 'red' | 'green' | 'gray' | 'yellow' | 'amber' | 'orange' | 'blue' | 'purple'
  type ToastOptions = Omit<NativeOptions, 'color'> & { color?: NativeOptions['color'] | LegacyColor; timeout?: number }
  const legacyColors: Record<LegacyColor, NonNullable<NativeOptions['color']>> = {
    red: 'error', green: 'success', gray: 'neutral', yellow: 'warning', amber: 'warning', orange: 'warning', blue: 'info', purple: 'secondary',
  }

  function add(options: ToastOptions) {
    const title = options?.title ?? ''
    const description = typeof options?.description === 'string' ? options.description : ''
    const key = `${String(title)}|${description}`
    const now = Date.now()
    if (lastKey === key && now - lastTime < DEDUPE_MS) {
      return
    }
    lastKey = key
    lastTime = now
    const { color, timeout, ...rest } = options
    const opts: NativeOptions = {
      ...rest,
      color: color && color in legacyColors ? legacyColors[color as LegacyColor] : color as NativeOptions['color'],
      duration: options.duration ?? timeout ?? DEFAULT_TIMEOUT,
    }
    return toast.add(opts)
  }

  return {
    ...toast,
    add,
  }
}
