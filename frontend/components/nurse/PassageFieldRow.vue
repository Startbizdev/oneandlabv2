<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors"
    :class="
      variant === 'action'
        ? 'border-primary-200 bg-primary-50 hover:bg-primary-100/80 dark:border-primary-800 dark:bg-primary-950/40'
        : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:bg-gray-800/50'
    "
    @click="$emit('click')"
  >
    <div class="min-w-0 flex-1">
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">{{ label }}</p>
      <p
        class="mt-0.5 text-sm font-medium"
        :class="empty ? 'text-gray-400' : 'text-gray-900 dark:text-white'"
      >
        {{ value }}
      </p>
    </div>
    <span
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      :class="variant === 'action' ? 'bg-white dark:bg-gray-900' : 'bg-gray-100 dark:bg-gray-800'"
    >
      <UIcon
        :name="variant === 'action' ? 'i-lucide-ellipsis' : 'i-lucide-pencil'"
        class="h-4 w-4 text-primary-500"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    value: string;
    empty?: boolean;
    variant?: 'edit' | 'action';
  }>(),
  { empty: false, variant: 'edit' },
);

defineEmits<{ click: [] }>();
</script>
