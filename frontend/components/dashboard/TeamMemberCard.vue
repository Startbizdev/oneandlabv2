<template>
  <div class="flex flex-col items-center text-center">
    <div class="w-20 h-20 rounded-full overflow-hidden border-2 border-default bg-muted flex-shrink-0 mb-3">
      <img
        v-if="photoSrc"
        :src="photoSrc"
        :alt="displayName"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center">
        <UIcon :name="icon" class="w-10 h-10 text-muted" />
      </div>
    </div>
    <p class="font-medium text-foreground truncate w-full">
      {{ displayName }}
    </p>
    <p class="text-sm text-muted truncate w-full mt-0.5">{{ email || '—' }}</p>
    <p v-if="phone" class="text-sm text-muted truncate w-full mt-0.5">{{ phone }}</p>
    <p v-if="$slots.extra || extraText" class="text-xs text-muted mt-2 w-full">
      <slot name="extra">{{ extraText }}</slot>
    </p>
    <p class="text-xs text-muted mt-1">{{ dateLabel }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    displayName: string
    email?: string | null
    phone?: string | null
    photoSrc?: string | null
    /** Ligne optionnelle (ex. "12 RDV · 8 terminés") */
    extraText?: string
    dateLabel: string
    icon?: string
  }>(),
  {
    email: '',
    phone: null,
    photoSrc: null,
    extraText: '',
    icon: 'i-lucide-user',
  }
);
</script>
