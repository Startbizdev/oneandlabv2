<template>
  <div class="flex items-start gap-4">
    <div
      class="size-16 shrink-0 overflow-hidden rounded-full border border-default bg-gray-100 dark:bg-gray-800"
    >
      <img
        v-if="imageUrl && !imageError"
        :src="imageUrl"
        :alt="name"
        class="size-full object-cover"
        @error="imageError = true"
      >
      <div v-else class="flex size-full items-center justify-center">
        <UIcon :name="fallbackIcon" class="size-7 text-muted" />
      </div>
    </div>
    <div class="min-w-0 flex-1">
      <h2 class="text-lg font-semibold leading-tight text-gray-900 break-words dark:text-white">
        {{ name }}
      </h2>
      <p class="mt-0.5 text-sm text-muted">
        {{ roleLabel }}
      </p>
      <div v-if="$slots.meta" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <slot name="meta" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string;
  roleLabel: string;
  imageUrl?: string;
  fallbackIcon: string;
}>();

const imageError = ref(false);

watch(() => props.imageUrl, () => {
  imageError.value = false;
});
</script>
