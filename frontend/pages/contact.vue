<template>
  <div class="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary-50/40 via-white to-gray-50">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 max-w-2xl">
      <!-- En-tête -->
      <header class="text-center mb-10 sm:mb-12">
        <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
          Nous contacter
        </h1>
        <p class="text-base sm:text-lg text-gray-600 font-normal max-w-xl mx-auto">
          Une question, un partenariat ou besoin d’aide ? Envoyez-nous un message, nous vous répondrons rapidement.
        </p>
      </header>

      <!-- Succès -->
      <div
        v-if="sent"
        class="rounded-2xl border border-green-200 bg-green-50 p-6 sm:p-8 text-center"
      >
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 text-green-600 mb-4">
          <UIcon name="i-lucide-check" class="w-7 h-7" />
        </div>
        <h2 class="text-xl font-semibold text-gray-900 mb-2">Message envoyé</h2>
        <p class="text-gray-600 mb-6">
          Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.
        </p>
        <UButton
          color="primary"
          variant="soft"
          @click="sent = false"
          class="font-medium"
        >
          Envoyer un autre message
        </UButton>
      </div>

      <!-- Formulaire -->
      <UCard v-else class="overflow-hidden shadow-lg border border-gray-100">
        <form @submit.prevent="onSubmit" class="p-6 sm:p-8 space-y-5">
          <UFormField label="Nom" name="name" required>
            <UInput
              v-model="form.name"
              type="text"
              placeholder="Votre nom"
              size="lg"
              class="w-full"
              :disabled="loading"
              autocomplete="name"
            >
              <template #leading>
                <UIcon name="i-lucide-user" class="w-5 h-5 text-gray-400" />
              </template>
            </UInput>
          </UFormField>

          <UFormField label="Email" name="email" required>
            <UInput
              v-model="form.email"
              type="email"
              placeholder="votre@email.com"
              size="lg"
              class="w-full"
              :disabled="loading"
              autocomplete="email"
            >
              <template #leading>
                <UIcon name="i-lucide-mail" class="w-5 h-5 text-gray-400" />
              </template>
            </UInput>
          </UFormField>

          <UFormField label="Sujet" name="subject" required>
            <UInput
              v-model="form.subject"
              type="text"
              placeholder="Objet de votre message"
              size="lg"
              class="w-full"
              :disabled="loading"
            >
              <template #leading>
                <UIcon name="i-lucide-message-square" class="w-5 h-5 text-gray-400" />
              </template>
            </UInput>
          </UFormField>

          <UFormField label="Message" name="message" required>
            <UTextarea
              v-model="form.message"
              placeholder="Votre message..."
              :rows="5"
              size="lg"
              class="w-full resize-y min-h-[120px]"
              :disabled="loading"
            />
          </UFormField>

          <div class="pt-2 flex flex-col sm:flex-row gap-3 justify-center sm:justify-end">
            <UButton
              type="submit"
              color="primary"
              size="lg"
              :loading="loading"
              :disabled="!canSubmit"
              class="w-full sm:w-auto font-semibold justify-center text-center min-w-[160px]"
            >
              Envoyer
              <template #trailing>
                <UIcon name="i-lucide-send" class="w-4 h-4" />
              </template>
            </UButton>
          </div>
        </form>
      </UCard>

      <!-- Infos complémentaires -->
      <div class="mt-10 sm:mt-12 text-center">
        <p class="text-sm text-gray-500">
          Vous pouvez aussi nous écrire à
          <a href="mailto:contact@oneandlab.fr" class="font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2">
            contact@oneandlab.fr
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
})

const loading = ref(false)
const sent = ref(false)

const canSubmit = computed(() =>
  form.name.trim() !== '' &&
  form.email.trim() !== '' &&
  form.subject.trim() !== '' &&
  form.message.trim() !== ''
)

async function onSubmit() {
  if (!canSubmit.value || loading.value) return
  loading.value = true
  try {
    // Option: appeler une API backend si elle existe
    // await $fetch('/api/contact', { method: 'POST', body: form })
    await new Promise(r => setTimeout(r, 600))
    sent.value = true
    form.name = ''
    form.email = ''
    form.subject = ''
    form.message = ''
  } finally {
    loading.value = false
  }
}

useHead({
  title: 'Contact — OneAndLab',
  meta: [
    { name: 'description', content: 'Contactez OneAndLab : questions, partenariats, support. Réponse rapide garantie.' },
  ],
})
</script>
