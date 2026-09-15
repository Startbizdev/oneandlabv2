<template>
  <div class="max-w-4xl space-y-5">
  <div class="grid gap-5 md:grid-cols-2">
    <article v-for="plan in LAB_PLAN_LIST" :key="plan.slug" class="flex min-w-0 flex-col rounded-2xl border bg-white p-6 sm:p-7 dark:bg-gray-950" :class="plan.slug === 'lab_pro' ? 'border-primary-500' : 'border-gray-200 dark:border-gray-800'">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xl font-semibold text-gray-950 dark:text-white">{{ plan.name }}</h2>
        <span v-if="currentPlan === plan.slug" class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">Votre offre</span>
      </div>
      <p class="mt-5 text-4xl font-semibold tracking-tight text-gray-950 dark:text-white">{{ plan.priceLabel }}<span class="text-base font-normal text-gray-500">/mois</span></p>
      <p class="mt-3 min-h-12 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{{ plan.tagline }}</p>
      <ul class="my-6 flex-1 space-y-3">
        <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary-800 dark:text-primary-300" aria-hidden="true" />{{ feature }}
        </li>
      </ul>
      <UButton block size="lg" :variant="plan.slug === 'lab_pro' ? 'solid' : 'outline'" :loading="busyPlan === plan.slug" :disabled="disabled || (!!busyPlan && busyPlan !== plan.slug)" @click="$emit('choose', plan.slug)">{{ hasSubscription ? 'Gérer mon abonnement' : `Choisir ${plan.name}` }}</UButton>
      <p class="mt-3 text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">30 jours d’essai pour un premier abonnement éligible. Puis {{ plan.priceLabel }}/mois. Résiliable à tout moment.</p>
    </article>
  </div>
  <article class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950" aria-label="Offre gratuite laboratoire">
    <div class="min-w-0 flex-1 basis-64">
      <h2 class="text-lg font-semibold text-gray-950 dark:text-white">Découverte · 0 €/mois</h2>
      <p class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">Ouvrez votre espace laboratoire gratuitement. Choisissez Starter pour ajouter des préleveurs, ou Pro pour gérer plusieurs équipes et sous-comptes.</p>
    </div>
    <UButton :to="freeTo" variant="outline" color="neutral" size="lg">{{ freeLabel }}</UButton>
  </article>
  </div>
</template>

<script setup lang="ts">
import { LAB_PLAN_LIST } from '@oneandlab/shared-constants';
withDefaults(defineProps<{ busyPlan?: string | null; disabled?: boolean; currentPlan?: string | null; hasSubscription?: boolean; freeTo?: string; freeLabel?: string }>(), {
  freeTo: '/lab/register', freeLabel: 'Démarrer gratuitement',
});
defineEmits<{ choose: [plan: 'lab_starter' | 'lab_pro'] }>();
</script>
