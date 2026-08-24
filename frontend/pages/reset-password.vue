<template>
  <div
    class="flex min-h-screen flex-col bg-app-canvas px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] dark:bg-gray-950"
  >
    <div class="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">
      <div class="rounded-xl border border-gray-200/90 bg-white px-5 py-6 dark:border-gray-800 dark:bg-gray-950">
        <h1 class="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Choisissez un nouveau mot de passe</h1>
        <p class="mt-1 text-[13px] text-gray-500">Au moins 8 caractères, une lettre et un chiffre.</p>

        <div class="mt-4 flex gap-2">
          <UButton
            size="xs"
            :variant="useCode ? 'solid' : 'outline'"
            @click="useCode = true"
          >
            J'ai reçu un code
          </UButton>
          <UButton
            size="xs"
            :variant="!useCode ? 'solid' : 'outline'"
            @click="useCode = false"
          >
            Lien email
          </UButton>
        </div>

        <form class="mt-5 space-y-4" @submit.prevent="onSubmit">
          <UFormField v-if="useCode" label="Email" name="email">
            <UInput v-model="email" type="email" autocomplete="email" class="w-full" />
          </UFormField>
          <UFormField v-if="useCode" label="Code à 6 chiffres" name="code">
            <UInput v-model="code" maxlength="6" class="w-full font-mono" />
          </UFormField>
          <UFormField label="Nouveau mot de passe" name="new_password">
            <UInput v-model="newPassword" type="password" autocomplete="new-password" class="w-full" />
          </UFormField>
          <UFormField label="Confirmation" name="confirm_password">
            <UInput v-model="confirmPassword" type="password" autocomplete="new-password" class="w-full" />
          </UFormField>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
          <UButton type="submit" block :loading="loading">Enregistrer</UButton>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { validatePasswordStrength, passwordsMatch } from '@oneandlab/shared-utils'

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()
const { resetPassword } = useAuth()
const toast = useAppToast()

const token = computed(() => String(route.query.token ?? ''))
const useCode = ref(!token.value)
const email = ref('')
const code = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  const check = validatePasswordStrength(newPassword.value, email.value || undefined)
  if (!check.valid) {
    error.value = check.error || 'Mot de passe invalide'
    return
  }
  if (!passwordsMatch(newPassword.value, confirmPassword.value)) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }
  loading.value = true
  try {
    const result = await resetPassword({
      new_password: newPassword.value,
      confirm_password: confirmPassword.value,
      ...(useCode.value
        ? { code: code.value.trim(), email: email.value.trim() }
        : { token: token.value }),
    })
    if (result.success) {
      toast.add({ title: 'Mot de passe mis à jour', color: 'green' })
      await router.replace('/login?mode=password')
    } else {
      error.value = result.error || 'Erreur'
    }
  } finally {
    loading.value = false
  }
}
</script>
