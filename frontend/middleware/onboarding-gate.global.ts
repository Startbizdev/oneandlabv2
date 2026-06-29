import {
  getOnboardingPath,
  isOnboardingCompleted,
} from '~/utils/onboarding-storage'
import {
  rememberNurseShareBeforeOnboarding,
  shouldApplyOnboardingGate,
} from '~/utils/onboarding-redirect'

export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return

  const { user, token } = useAuth()
  if (!token.value || !user.value?.role) return
  if (user.value.must_change_password) return

  const pathname = to.path.split('?')[0]
  const role = user.value.role
  const query = to.query as Record<string, unknown>

  if (!shouldApplyOnboardingGate(pathname, role, query)) return
  if (isOnboardingCompleted(role)) return

  rememberNurseShareBeforeOnboarding(query)
  return navigateTo(getOnboardingPath(role))
})
