<template>
  <div class="space-y-6">
    <TitleDashboard :title="title" :description="description">
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </TitleDashboard>

    <UAlert v-if="error" color="error" variant="soft" :title="error" />

    <!-- Cartes stats (fond blanc, détail soigné) -->
    <section class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <template v-if="loading">
        <div v-for="i in 4" :key="i" class="h-[88px] rounded-xl border border-gray-200 bg-white shadow-sm animate-pulse dark:border-gray-700 dark:bg-gray-900" />
      </template>
      <template v-else>
        <button
          v-for="card in statsCards"
          :key="card.title"
          type="button"
          class="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-gray-300 hover:shadow focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600"
          :class="{ 'cursor-pointer': card.to, 'cursor-default': !card.to }"
          @click="card.to ? $router.push(card.to) : null"
        >
          <div
            :class="[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
              card.iconBg,
            ]"
          >
            <UIcon :name="card.icon" :class="['h-5 w-5', card.iconColor]" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white">
              {{ card.value }}
            </p>
            <p class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              {{ card.title }}
            </p>
          </div>
          <UIcon
            v-if="card.to"
            name="i-lucide-chevron-right"
            class="h-5 w-5 shrink-0 text-gray-400 opacity-0 transition group-hover:opacity-100 dark:text-gray-500"
          />
        </button>
      </template>
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
