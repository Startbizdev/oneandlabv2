<template>
  <UCard>
    <template #header>
      <div>
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Connexion et sécurité</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Mot de passe optionnel — vous pouvez toujours utiliser le code par email.
        </p>
      </div>
    </template>

    <UAlert
      v-if="mustChange"
      color="warning"
      variant="subtle"
      class="mb-4"
      title="Pour continuer, choisissez un nouveau mot de passe."
    />

    <form class="space-y-4" @submit.prevent="onSubmit">
      <UFormField v-if="hasPassword" label="Mot de passe actuel" name="current_password">
        <UInput v-model="currentPassword" type="password" autocomplete="current-password" class="w-full" />
      </UFormField>

      <UFormField :label="hasPassword ? 'Nouveau mot de passe' : 'Mot de passe'" name="new_password">
        <UInput v-model="newPassword" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>

      <UFormField label="Confirmation" name="confirm_password">
        <UInput v-model="confirmPassword" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>

      <p v-if="validationError" class="text-sm text-red-600">{{ validationError }}</p>

      <div class="flex flex-wrap items-center gap-3">
        <UButton type="submit" :loading="loading">
          {{ hasPassword ? 'Mettre à jour' : 'Enregistrer mon mot de passe' }}
        </UButton>
        <UButton v-if="hasPassword" variant="ghost" type="button" :loading="resetLoading" @click="sendResetEmail">
          Mot de passe oublié ?
        </UButton>
      </div>
    </form>

    <p class="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
      <UIcon name="i-lucide-lock" class="h-3.5 w-3.5" />
      Connexion possible par code email ou mot de passe
    </p>
  </UCard>
</template>

<script setup lang="ts">
import { validatePasswordStrength, passwordsMatch } from '@oneandlab/shared-utils'

const { user, updatePassword, forgotPassword, fetchCurrentUser } = useAuth()
const toast = useAppToast()
const route = useRoute()
const router = useRouter()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const resetLoading = ref(false)
const validationError = ref('')

const hasPassword = computed(() => Boolean(user.value?.has_password))
const mustChange = computed(
  () => Boolean(user.value?.must_change_password) || route.query.changePassword === '1',
)

onMounted(async () => {
  await fetchCurrentUser()
})

async function onSubmit() {
  validationError.value = ''
  const check = validatePasswordStrength(newPassword.value, user.value?.email)
  if (!check.valid) {
    validationError.value = check.error || 'Mot de passe invalide'
    return
  }
  if (!passwordsMatch(newPassword.value, confirmPassword.value)) {
    validationError.value = 'Les mots de passe ne correspondent pas'
    return
  }

  loading.value = true
  try {
    const result = await updatePassword({
      new_password: newPassword.value,
      confirm_password: confirmPassword.value,
      ...(hasPassword.value ? { current_password: currentPassword.value } : {}),
    })
    if (result.success) {
      toast.add({ title: 'Mot de passe enregistré', color: 'green' })
      currentPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
      if (route.query.changePassword) {
        await router.replace('/profile')
      }
    } else {
      validationError.value = result.error || 'Erreur'
    }
  } finally {
    loading.value = false
  }
}

async function sendResetEmail() {
  const email = user.value?.email
  if (!email) return
  resetLoading.value = true
  try {
    await forgotPassword(email)
    toast.add({
      title: 'Email envoyé',
      description: 'Consultez votre boîte de réception pour réinitialiser votre mot de passe.',
      color: 'green',
    })
  } finally {
    resetLoading.value = false
  }
}
</script>
