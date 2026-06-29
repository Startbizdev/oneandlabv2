<template>
  <div v-if="phoneDisplay" class="space-y-1.5 pt-1.5">
    <p class="text-xs text-muted tabular-nums break-all">
      {{ phoneDisplay }}
    </p>
    <div
      v-if="telHref || smsHref"
      class="hidden max-sm:flex flex-wrap items-center gap-2"
    >
      <UButton
        v-if="telHref"
        size="xs"
        variant="outline"
        color="neutral"
        leading-icon="i-lucide-phone"
        class="shrink-0"
        :href="telHref"
      >
        Appeler
      </UButton>
      <UButton
        v-if="smsHref"
        size="xs"
        variant="outline"
        color="neutral"
        leading-icon="i-lucide-message-square"
        class="shrink-0"
        :href="smsHref"
      >
        Message
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  phone?: string | null;
}>();

const phoneDisplay = computed(() => String(props.phone ?? '').trim());

const telHref = computed(() => {
  const t = phoneDisplay.value;
  if (!t) return '';
  return `tel:${t.replace(/\s/g, '')}`;
});

const smsHref = computed(() => {
  const t = phoneDisplay.value;
  if (!t) return '';
  return `sms:${t.replace(/\s/g, '')}`;
});
</script>
