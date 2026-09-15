<template>
  <div class="min-w-0 space-y-6 sm:space-y-8">
    <AppPageHeader :title="title" :description="description">
      <template v-if="$slots.actions" #actions><slot name="actions" /></template>
    </AppPageHeader>

    <UAlert v-if="error" color="error" variant="soft" :title="error" />

    <section v-if="loading || statsCards.length" aria-label="Votre activité en chiffres" :aria-busy="loading">
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <template v-if="loading">
          <div v-for="i in 4" :key="i" class="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950" aria-hidden="true">
            <div class="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            <div class="h-8 w-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </div>
          <span class="sr-only" role="status">Chargement des indicateurs</span>
        </template>
        <template v-else>
          <component
            :is="card.to ? NuxtLink : 'div'"
            v-for="card in statsCards"
            :key="card.title"
            v-bind="card.to ? { to: card.to } : {}"
            class="group min-w-0 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors sm:p-5 dark:border-gray-800 dark:bg-gray-950"
            :class="card.to ? 'hover:border-primary-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600' : ''"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="text-sm font-medium leading-snug text-gray-600 dark:text-gray-400">{{ card.title }}</span>
              <UIcon :name="card.icon" class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
            </div>
            <div class="mt-3 flex items-end justify-between gap-2">
              <span class="break-words text-3xl font-semibold tabular-nums tracking-tight text-gray-950 dark:text-white">{{ card.value }}</span>
              <UIcon v-if="card.to" name="i-lucide-arrow-up-right" class="size-4 text-gray-400 group-hover:text-primary-700 dark:group-hover:text-primary-300" aria-hidden="true" />
            </div>
          </component>
        </template>
      </div>
    </section>

    <div class="grid min-w-0 grid-cols-1 items-start gap-6" :class="$slots.sidebar ? 'xl:grid-cols-[minmax(0,1fr)_18rem]' : ''">
      <div class="min-w-0 space-y-6"><slot name="main" /></div>
      <aside v-if="$slots.sidebar" class="min-w-0 space-y-6" aria-label="Outils de votre espace"><slot name="sidebar" /></aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NuxtLink } from '#components'
export interface StatsCard {
  icon: string
  iconBg: string
  iconColor: string
  value: string | number
  title: string
  to?: string | null
}

interface Props {
  title: string
  description: string
  loading?: boolean
  error?: string | null
  statsCards: StatsCard[]
}

withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
})
</script>
