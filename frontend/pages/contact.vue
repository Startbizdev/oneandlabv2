<template>
  <div>
    <LandingMaquetteHero
      eyebrow="Assistance Cary"
      :title-lines="['Parlons de', 'votre']"
      highlight="besoin"
      description="Une question sur un rendez-vous, un projet de partenariat laboratoire ou infirmier, ou une demande générale : choisissez un motif et envoyez votre message — réponse sous 24-48 h ouvrées."
      image-src="https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=900&h=1200&q=80&auto=format&fit=crop"
      image-alt="Téléconseillère souriante avec un casque"
      image-object-class="object-[center_25%]"
      :primary-cta="{ label: 'Écrire à l’équipe', to: '#message', icon: 'i-lucide-mail' }"
      :secondary-cta="{ label: 'Voir nos coordonnées', to: '#coordonnees', icon: 'i-lucide-map-pin' }"
      :stats="contactStats"
      hide-quote
    />
  <LandingMaquetteMarketingBackdrop>

    <section id="message" class="px-6 pb-[72px] pt-[72px] lg:px-12 lg:pb-[100px] lg:pt-[100px]">
      <div class="mx-auto max-w-[1200px]">
        <div
          v-if="sent"
          class="mx-auto max-w-md rounded-[22px] border border-[#E8E8F0] bg-white p-10 text-center shadow-[0_4px_24px_-6px_rgb(15_23_42/0.08)] dark:border-gray-800 dark:bg-gray-950"
        >
          <div
            class="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400"
          >
            <UIcon name="i-lucide-check" class="h-6 w-6" />
          </div>
          <h2 class="mb-2 text-lg font-semibold text-[#0A0A0F] dark:text-white">Message envoyé</h2>
          <p class="mb-8 text-sm leading-relaxed text-[#3D3D52] dark:text-gray-300">
            Nous avons bien reçu votre message et vous répondrons à l’adresse indiquée dans les plus brefs délais.
          </p>
          <UButton color="primary" variant="soft" class="font-medium" @click="sent = false">
            Envoyer un autre message
          </UButton>
        </div>

        <div v-else class="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div class="order-2 space-y-8 lg:order-1 lg:col-span-5">
            <div>
              <h2 class="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-500">Motif de contact</h2>
              <div class="space-y-3">
                <label
                  v-for="opt in contactOptions"
                  :key="opt.value"
                  class="flex cursor-pointer items-center gap-3 rounded-[18px] border px-4 py-3 transition-colors"
                  :class="
                    form.contactType === opt.value
                      ? 'border-primary-500 bg-primary-500/[0.06] shadow-[0_1px_2px_0_rgb(15_23_42/_0.04)] dark:border-primary-400 dark:bg-primary-500/10'
                      : 'border-[#E8E8F0] bg-white hover:border-[#9090A8] dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-600'
                  "
                >
                  <input
                    v-model="form.contactType"
                    type="radio"
                    :value="opt.value"
                    name="contactType"
                    class="border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600"
                  />
                  <span class="text-sm font-medium text-[#0A0A0F] dark:text-white">{{ opt.label }}</span>
                  <UIcon v-if="opt.icon" :name="opt.icon" class="ml-auto h-4 w-4 text-[#9090A8] dark:text-gray-500" />
                </label>
              </div>
            </div>

            <div
              id="coordonnees"
              class="scroll-mt-[88px] rounded-[22px] border border-[#E8E8F0] bg-white p-6 shadow-[0_4px_24px_-6px_rgb(15_23_42/0.06)] dark:border-gray-800 dark:bg-gray-950"
            >
              <h2 class="mb-4 text-sm font-semibold text-[#0A0A0F] dark:text-white">Nos coordonnées</h2>
              <address class="not-italic text-sm leading-relaxed text-[#3D3D52] dark:text-gray-300">
                <p class="font-medium text-[#0A0A0F] dark:text-white">Cary — ZENFACT SAS</p>
                <p class="mt-3">
                  230 B avenue Corot<br />
                  13014 Marseille
                </p>
                <p class="mt-3">
                  <a
                    href="mailto:contact@oneandlab.fr"
                    class="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    contact@oneandlab.fr
                  </a>
                </p>
                <p class="mt-2">
                  <a
                    href="tel:+33491234567"
                    class="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    04 91 23 45 67
                  </a>
                </p>
                <p class="mt-4 border-t border-[#E8E8F0] pt-4 text-xs text-[#9090A8] dark:border-gray-800 dark:text-gray-500">
                  Lun–Ven 9h–18h, Sam 9h–12h
                </p>
              </address>
              <p class="mt-4 text-xs text-[#9090A8] dark:text-gray-500">
                <NuxtLink to="/mentions-legales" class="text-primary-600 hover:underline dark:text-primary-400">
                  Mentions légales
                </NuxtLink>
              </p>
            </div>
          </div>

          <div class="order-1 lg:order-2 lg:col-span-7">
            <div
              class="rounded-[22px] border border-[#E8E8F0] bg-white p-6 shadow-[0_4px_24px_-6px_rgb(15_23_42/0.06)] sm:p-10 dark:border-gray-800 dark:bg-gray-950"
            >
              <h2 class="mb-6 text-sm font-semibold text-[#0A0A0F] dark:text-white">Votre message</h2>
              <form class="space-y-5" @submit.prevent="onSubmit">
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
                      <UIcon name="i-lucide-user" class="h-5 w-5 text-gray-400" />
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
                      <UIcon name="i-lucide-mail" class="h-5 w-5 text-gray-400" />
                    </template>
                  </UInput>
                </UFormField>

                <UFormField label="Message" name="message" required>
                  <UTextarea
                    v-model="form.message"
                    placeholder="Décrivez votre demande..."
                    :rows="5"
                    size="lg"
                    class="min-h-[140px] w-full resize-y"
                    :disabled="loading"
                  />
                </UFormField>

                <div class="flex justify-end pt-2">
                  <UButton
                    type="submit"
                    color="primary"
                    size="lg"
                    :loading="loading"
                    :disabled="!canSubmit"
                    class="min-w-[160px] font-medium"
                  >
                    Envoyer
                    <template #trailing>
                      <UIcon name="i-lucide-send" class="h-4 w-4" />
                    </template>
                  </UButton>
                </div>
              </form>
            </div>
          </div>
        </div>

        <p v-if="!sent" class="mt-14 text-center text-sm text-[#9090A8] dark:text-gray-500">
          Vous pouvez aussi nous écrire directement à
          <a
            href="mailto:contact@oneandlab.fr"
            class="font-medium text-primary-600 underline decoration-primary-600/40 underline-offset-2 hover:text-primary-700 dark:text-primary-400"
          >
            contact@oneandlab.fr
          </a>
        </p>
      </div>
    </section>
  </LandingMaquetteMarketingBackdrop>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const contactStats = [
  { num: '24-48 h', rest: ' délai de réponse ouvré' },
  { num: 'Lun–Ven 9h–18h', rest: ' équipe joignable' },
  { num: 'Sam 9h–12h', rest: ' permanence courte' },
];

const contactOptions = [
  { value: 'rdv', label: 'Problème avec un rendez-vous', icon: 'i-lucide-calendar-clock' },
  { value: 'partenariat_labo', label: 'Partenariat laboratoire', icon: 'i-lucide-building-2' },
  { value: 'partenariat_infirmier', label: 'Partenariat infirmier', icon: 'i-lucide-stethoscope' },
  { value: 'question', label: 'Question générale', icon: 'i-lucide-help-circle' },
  { value: 'reclamation', label: 'Réclamation', icon: 'i-lucide-alert-circle' },
  { value: 'autre', label: 'Autre', icon: 'i-lucide-message-square' },
];

const form = reactive({
  name: '',
  email: '',
  contactType: '' as string,
  message: '',
});

const loading = ref(false);
const sent = ref(false);

const canSubmit = computed(
  () =>
    form.name.trim() !== '' &&
    form.email.trim() !== '' &&
    form.contactType !== '' &&
    form.message.trim() !== '',
);

async function onSubmit() {
  if (!canSubmit.value || loading.value) return;
  loading.value = true;
  try {
    const { apiFetch } = await import('~/utils/api');
    const res = (await apiFetch('/contact', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        email: form.email.trim(),
        contactType: form.contactType,
        message: form.message.trim(),
      },
    })) as { success?: boolean; error?: string; message?: string };
    if (res?.success) {
      sent.value = true;
      form.name = '';
      form.email = '';
      form.contactType = '';
      form.message = '';
    } else {
      throw new Error(res?.error ?? 'Envoi impossible');
    }
  } catch (e: any) {
    const msg = e?.message ?? 'Une erreur est survenue. Vous pouvez nous écrire à contact@oneandlab.fr.';
    const toast = useToast();
    toast.add({ title: 'Erreur', description: msg, color: 'red' });
  } finally {
    loading.value = false;
  }
}

useHead({
  title: 'Contact — Cary',
  meta: [
    {
      name: 'description',
      content:
        'Contactez Cary : problème RDV, partenariat laboratoire ou infirmier, questions. Adresse : 230 B avenue Corot, 13014 Marseille.',
    },
  ],
});
</script>
