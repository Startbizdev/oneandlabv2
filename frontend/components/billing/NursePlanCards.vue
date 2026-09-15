<template>
  <div class="grid max-w-4xl gap-5 md:grid-cols-2">
    <article v-for="plan in NURSE_PLAN_LIST" :key="plan.slug" class="flex min-w-0 flex-col rounded-2xl border bg-white p-6 sm:p-7 dark:bg-gray-950" :class="plan.recommended ? 'border-primary-500' : 'border-gray-200 dark:border-gray-800'">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xl font-semibold text-gray-950 dark:text-white">{{ plan.name }}</h2>
        <span v-if="plan.recommended" class="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800 dark:bg-primary-950 dark:text-primary-200">Pour développer votre activité</span>
      </div>
      <p class="mt-5 text-4xl font-semibold tracking-tight text-gray-950 dark:text-white">{{ plan.priceLabel }}<span class="text-base font-normal text-gray-500">{{ plan.priceSuffix }}</span></p>
      <p class="mt-3 min-h-12 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{{ plan.slug === 'discovery' ? 'Votre présence en ligne et vos premiers rendez-vous, sans carte bancaire.' : 'Pour recevoir davantage de demandes et organiser votre activité au quotidien.' }}</p>
      <ul class="my-6 flex-1 space-y-3">
        <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary-800 dark:text-primary-300" aria-hidden="true" />{{ feature }}
        </li>
      </ul>
      <UButton v-if="plan.slug === 'discovery'" :to="freeTo" block size="lg" variant="outline" color="neutral">{{ freeLabel }}</UButton>
      <UButton v-else block size="lg" :loading="busy" :disabled="disabled" @click="$emit('choose-pro')">{{ proLabel }}</UButton>
      <p class="mt-3 text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ plan.slug === 'discovery' ? 'Le pack gratuit reste disponible.' : '30 jours d’essai pour un premier abonnement éligible. Puis 29 €/mois. Résiliable à tout moment.' }}</p>
    </article>
  </div>
</template>

<script setup lang="ts">
import { NURSE_PLAN_LIST } from '@oneandlab/shared-constants';
withDefaults(defineProps<{ busy?: boolean; disabled?: boolean; freeTo?: string; freeLabel?: string; proLabel?: string }>(), {
  busy: false, freeTo: '/nurse/register', freeLabel: 'Créer mon compte gratuit', proLabel: 'Choisir Pro',
});
defineEmits<{ 'choose-pro': [] }>();
</script>
