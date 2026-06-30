<template>
  <div class="space-y-6">
    <AppPageHeader :title="title" :description="description">
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </AppPageHeader>

    <UAlert v-if="error" color="error" variant="soft" :title="error" />

    <!-- KPI — bande linéaire (liste sur mobile, rangée depuis md) -->
    <section class="overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-800 dark:bg-gray-950 dark:shadow-none">
      <template v-if="loading">
        <div
          class="divide-y divide-gray-100 dark:divide-gray-800 md:flex md:flex-nowrap md:divide-x md:divide-y-0 md:divide-gray-100 dark:md:divide-gray-800"
        >
          <div
            v-for="i in 4"
            :key="i"
            class="min-h-[3.25rem] animate-pulse md:min-h-0 md:flex-1"
          >
            <div class="flex items-center gap-3 px-4 py-3 md:flex-col md:items-stretch md:gap-2.5 md:px-5 md:py-4">
              <div class="flex items-center gap-3 md:flex-1">
                <div class="h-9 w-9 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 md:h-10 md:w-10" />
                <div class="flex-1 space-y-2 md:flex md:flex-col-reverse md:gap-1 md:space-y-0">
                  <div class="h-7 w-12 rounded-md bg-gray-100 dark:bg-gray-800 md:h-9 md:w-20" />
                  <div class="h-3.5 max-w-[7rem] rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <div
        v-else
        class="divide-y divide-gray-100 dark:divide-gray-800 md:flex md:flex-nowrap md:divide-x md:divide-y-0 md:divide-gray-100 dark:md:divide-gray-800"
      >
        <component
          :is="card.to ? 'button' : 'div'"
          v-for="card in statsCards"
          :key="card.title"
          v-bind="card.to ? { type: 'button' } : {}"
          class="group relative flex w-full min-w-0 text-left outline-none transition-colors md:flex-1 md:flex-col"
          :class="[
            card.to
              ? 'cursor-pointer hover:bg-gray-50/90 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/25 dark:hover:bg-gray-900/70'
              : 'cursor-default',
          ]"
          @click="card.to ? $router.push(card.to) : undefined"
        >
          <div
            class="relative flex flex-1 items-center justify-between gap-3 px-4 py-3 sm:gap-4 md:flex-col md:items-stretch md:justify-between md:gap-3 md:px-5 md:py-4"
            :class="{ 'pr-11': !!card.to }"
          >
            <div class="flex min-w-0 flex-1 items-center gap-3 md:gap-2.5">
              <div
                :class="[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10',
                  card.iconBg,
                ]"
              >
                <UIcon :name="card.icon" :class="['h-[18px] w-[18px] md:h-5 md:w-5', card.iconColor]" />
              </div>
              <p class="truncate text-[13px] font-medium leading-tight text-gray-600 md:text-xs md:font-semibold md:uppercase md:tracking-wide md:text-gray-500 dark:text-gray-400">
                {{ card.title }}
              </p>
            </div>

            <div class="flex shrink-0 items-center md:self-end md:justify-end md:pb-px">
              <span class="text-xl font-semibold tabular-nums tracking-tight text-gray-900 md:text-2xl dark:text-white">
                {{ card.value }}
              </span>
            </div>
            <UIcon
              v-if="card.to"
              name="i-lucide-chevron-right"
              class="pointer-events-none absolute right-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-300 opacity-0 transition group-hover:opacity-100 md:right-4 dark:text-gray-600"
              aria-hidden="true"
            />
          </div>
        </component>
      </div>
    </section>

    <!-- Contenu principal + sidebar -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
      <div class="space-y-6 lg:col-span-2">
        <slot name="main" />
      </div>
      <div v-if="$slots.sidebar" class="space-y-6 lg:sticky lg:top-6">
        <slot name="sidebar" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
