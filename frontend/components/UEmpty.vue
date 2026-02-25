<template>
  <div
    class="flex flex-col items-center justify-center text-center"
    :class="[
      variant === 'naked' ? 'py-8' : 'p-8 rounded-lg border border-default bg-muted/30',
      size === 'xl' ? 'gap-4' : 'gap-3',
    ]"
  >
    <UIcon
      v-if="icon"
      :name="icon"
      class="text-muted shrink-0"
      :class="size === 'xl' ? 'size-12' : 'size-10'"
    />
    <img
      v-else-if="avatar?.src"
      :src="avatar.src"
      alt=""
      class="rounded-full object-cover shrink-0 bg-muted"
      :class="size === 'xl' ? 'size-12' : 'size-10'"
    />
    <div class="space-y-1">
      <h3 v-if="title" class="font-normal text-foreground">
        {{ title }}
      </h3>
      <p v-if="description" class="text-sm text-muted max-w-sm mx-auto">
        {{ description }}
      </p>
    </div>
    <div v-if="actions?.length" class="flex flex-wrap items-center justify-center gap-2 mt-2">
      <UButton
        v-for="(action, i) in actions"
        :key="i"
        :icon="action.icon"
        :label="action.label"
        :variant="action.variant ?? 'outline'"
        :color="action.color ?? 'primary'"
        :to="action.to"
        :href="action.href"
        @click="action.onClick?.($event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface EmptyAction {
  label: string
  icon?: string
  variant?: string
  color?: string
  to?: string
  href?: string
  onClick?: (e: Event) => void
  [key: string]: unknown
}

defineProps<{
  icon?: string
  title?: string
  description?: string
  avatar?: { src: string }
  actions?: EmptyAction[]
  variant?: 'naked' | 'default'
  size?: 'md' | 'xl'
}>()
</script>
