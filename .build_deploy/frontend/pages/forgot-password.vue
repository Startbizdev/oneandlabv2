<template>
  <div
    class="flex min-h-screen flex-col bg-app-canvas px-4 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] dark:bg-gray-950"
  >
    <div class="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">
      <div class="mb-6 text-center">
        <NuxtLink to="/login">
          <img src="/images/logo-cary.png" alt="Cary" class="mx-auto h-8 w-auto" />
        </NuxtLink>
      </div>

      <div class="rounded-xl border border-gray-200/90 bg-white px-5 py-6 dark:border-gray-800 dark:bg-gray-950">
        <template v-if="!sent">
          <h1 class="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Mot de passe oublié</h1>
          <p class="mt-1 text-[13px] text-gray-500">Nous vous enverrons les instructions par email.</p>
          <form class="mt-5 space-y-4" @submit.prevent="onSubmit">
            <UFormField label="Email" name="email">
              <UInput v-model="email" type="email" autocomplete="email" class="w-full" />
            </UFormField>
            <UButton type="submit" block :loading="loading" :disabled="!email.trim()">Envoyer</UButton>
          </form>
        </template>
        <template v-else>
          <h1 class="text-[15px] font-semibold text-gray-900 dark:text-gray-100">Vérifiez votre email</h1>
          <p class="mt-2 text-[13px] leading-relaxed text-gray-500">
            Si un compte existe avec cette adresse, vous recevrez un email avec un lien et un code pour choisir un
            nouveau mot de passe.
          </p>
          <UButton to="/login?mode=password" block class="mt-5" variant="outline">Retour à la connexion</UButton>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { forgotPassword } = useAuth()
const toast = useAppToast()
const email = ref('')
const loading = ref(false)
const sent = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    const result = await forgotPassword(email.value.trim())
    if (result.success) sent.value = true
    else toast.add({ title: 'Erreur', description: result.error, color: 'red' })
  } finally {
    loading.value = false
  }
}
</script>
