<template>
  <div class="min-h-[calc(100vh-4rem)] bg-[#fafafa] border-t border-gray-100">
    <div class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
      <!-- En-tête sobre type Linear/Stripe -->
      <header class="text-center mb-12 sm:mb-16">
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
          Nous contacter
        </h1>
        <p class="mt-3 text-base text-gray-600 max-w-xl mx-auto">
          Une question, un problème de rendez-vous ou un projet de partenariat ? Choisissez un motif et envoyez-nous un message. Réponse sous 24–48 h.
        </p>
      </header>

      <!-- Succès -->
      <div
        v-if="sent"
        class="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm"
      >
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 text-primary-600 mb-4">
          <UIcon name="i-lucide-check" class="w-6 h-6" />
        </div>
        <h2 class="text-lg font-semibold text-gray-900 mb-2">Message envoyé</h2>
        <p class="text-gray-600 text-sm mb-6">
          Nous avons bien reçu votre message et vous répondrons à l’adresse indiquée dans les plus brefs délais.
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

      <!-- Contenu principal : grille 2 colonnes desktop -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        <!-- Colonne gauche : motif + coordonnées (style Notion/Stripe) -->
        <div class="lg:col-span-5 order-2 lg:order-1">
          <section class="space-y-8">
            <!-- Motif de contact -->
            <div>
              <h2 class="text-sm font-medium text-gray-900 mb-3">Motif de contact</h2>
              <div class="space-y-2">
                <label
                  v-for="opt in contactOptions"
                  :key="opt.value"
                  class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                  :class="form.contactType === opt.value
                    ? 'border-primary-500 bg-primary-50/50'
                    : 'border-gray-200 bg-white hover:border-gray-300'"
                >
                  <input
                    v-model="form.contactType"
                    type="radio"
                    :value="opt.value"
                    name="contactType"
                    class="rounded-full border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span class="text-sm font-medium text-gray-900">{{ opt.label }}</span>
                  <UIcon v-if="opt.icon" :name="opt.icon" class="w-4 h-4 text-gray-400 ml-auto" />
                </label>
              </div>
            </div>

            <!-- Coordonnées (adresse mentions légales) -->
            <div class="rounded-2xl border border-gray-200 bg-white p-6">
              <h2 class="text-sm font-medium text-gray-900 mb-4">Nos coordonnées</h2>
              <address class="not-italic text-sm text-gray-600 space-y-3">
                <p class="font-medium text-gray-900">OneAndLab — ZENFACT SAS</p>
                <p>230 B avenue Corot<br>13014 Marseille</p>
                <p>
                  <a href="mailto:contact@oneandlab.fr" class="text-primary-600 hover:text-primary-700 font-medium">
                    contact@oneandlab.fr
                  </a>
                </p>
                <p>
                  <a href="tel:+33491234567" class="text-primary-600 hover:text-primary-700 font-medium">
                    04 91 23 45 67
                  </a>
                </p>
                <p class="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  Lun–Ven 9h–18h, Sam 9h–12h
                </p>
              </address>
              <p class="mt-4 text-xs text-gray-500">
                <NuxtLink to="/mentions-legales" class="text-primary-600 hover:underline">
                  Mentions légales
                </NuxtLink>
              </p>
            </div>
          </section>
        </div>

        <!-- Colonne droite : formulaire -->
        <div class="lg:col-span-7 order-1 lg:order-2">
          <div class="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
            <h2 class="text-sm font-medium text-gray-900 mb-5">Votre message</h2>
            <form @submit.prevent="onSubmit" class="space-y-5">
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

              <UFormField label="Message" name="message" required>
                <UTextarea
                  v-model="form.message"
                  placeholder="Décrivez votre demande..."
                  :rows="5"
                  size="lg"
                  class="w-full resize-y min-h-[140px]"
                  :disabled="loading"
                />
              </UFormField>

              <div class="pt-2 flex justify-end">
                <UButton
                  type="submit"
                  color="primary"
                  size="lg"
                  :loading="loading"
                  :disabled="!canSubmit"
                  class="font-medium min-w-[160px]"
                >
                  Envoyer
                  <template #trailing>
                    <UIcon name="i-lucide-send" class="w-4 h-4" />
                  </template>
                </UButton>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Rappel email en bas -->
      <p v-if="!sent" class="mt-12 text-center text-sm text-gray-500">
        Vous pouvez aussi nous écrire directement à
        <a href="mailto:contact@oneandlab.fr" class="font-medium text-primary-600 hover:text-primary-700 underline underline-offset-2">
          contact@oneandlab.fr
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const contactOptions = [
  { value: 'rdv', label: 'Problème avec un rendez-vous', icon: 'i-lucide-calendar-clock' },
  { value: 'partenariat_labo', label: 'Partenariat laboratoire', icon: 'i-lucide-building-2' },
  { value: 'partenariat_infirmier', label: 'Partenariat infirmier', icon: 'i-lucide-stethoscope' },
  { value: 'question', label: 'Question générale', icon: 'i-lucide-help-circle' },
  { value: 'reclamation', label: 'Réclamation', icon: 'i-lucide-alert-circle' },
  { value: 'autre', label: 'Autre', icon: 'i-lucide-message-square' },
]

const form = reactive({
  name: '',
  email: '',
  contactType: '' as string,
  message: '',
})

const loading = ref(false)
const sent = ref(false)

const canSubmit = computed(() =>
  form.name.trim() !== '' &&
  form.email.trim() !== '' &&
  form.contactType !== '' &&
  form.message.trim() !== ''
)

async function onSubmit() {
  if (!canSubmit.value || loading.value) return
  loading.value = true
  try {
    const { apiFetch } = await import('~/utils/api')
    const res = await apiFetch('/contact', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        contactType: form.contactType,
        message: form.message.trim(),
      },
    }) as { success?: boolean; error?: string; message?: string }
    if (res?.success) {
      sent.value = true
      form.name = ''
      form.email = ''
      form.contactType = ''
      form.message = ''
    } else {
      throw new Error(res?.error ?? 'Envoi impossible')
    }
  } catch (e: any) {
    const msg = e?.message ?? 'Une erreur est survenue. Vous pouvez nous écrire à contact@oneandlab.fr.'
    const toast = useToast()
    toast.add({ title: 'Erreur', description: msg, color: 'red' })
  } finally {
    loading.value = false
  }
}

useHead({
  title: 'Contact — OneAndLab',
  meta: [
    { name: 'description', content: 'Contactez OneAndLab : problème RDV, partenariat laboratoire ou infirmier, questions. Réponse rapide. Adresse : 230 B avenue Corot, 13014 Marseille.' },
  ],
})
</script>
