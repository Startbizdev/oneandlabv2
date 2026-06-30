import {
  getOnboardingPath,
  isOnboardingCompleted,
} from '~/utils/onboarding-storage'
import { shouldApplyOnboardingGate } from '~/utils/onboarding-redirect'

export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return

  const { user, token } = useAuth()
  if (!token.value || !user.value?.role) return
  if (user.value.must_change_password) return

  const pathname = to.path.split('?')[0]
  const role = user.value.role

  if (!shouldApplyOnboardingGate(pathname, role)) return
  if (isOnboardingCompleted(role)) return

  return navigateTo(getOnboardingPath(role))
})
