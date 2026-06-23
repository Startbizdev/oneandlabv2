import { isTutorialRole, type TutorialRole } from '@oneandlab/onboarding'

const STORAGE_KEY = 'oneandlab:onboarding-completed'

type CompletionMap = Partial<Record<TutorialRole, boolean>>

function readMap(): CompletionMap {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CompletionMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeMap(map: CompletionMap) {
  if (!import.meta.client) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function isOnboardingCompleted(role: string | null | undefined): boolean {
  if (!isTutorialRole(role)) return true
  return Boolean(readMap()[role])
}

export function setOnboardingCompleted(role: TutorialRole, completed: boolean) {
  const map = readMap()
  map[role] = completed
  writeMap(map)
}

export function getOnboardingPath(role: TutorialRole, replay = false): string {
  const query = replay ? '?replay=1' : ''
  return `/${role}/onboarding${query}`
}
