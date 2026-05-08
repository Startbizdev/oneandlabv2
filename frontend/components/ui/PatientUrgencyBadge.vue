<script setup lang="ts">
import { computed } from 'vue';
import { isPatientUrgencyBooking } from '~/utils/patient-urgency-display';

const props = defineProps<{
  appointment: unknown;
}>();

const show = computed(() => isPatientUrgencyBooking(props.appointment as Parameters<typeof isPatientUrgencyBooking>[0]));
</script>

<template>
  <UBadge
    v-if="show"
    color="warning"
    variant="subtle"
    size="sm"
    leading-icon="i-lucide-star"
    label="Horaire VIP"
    class="shrink-0 border-0 font-semibold shadow-none ring-1 ring-amber-500/25 dark:ring-amber-400/25"
  />
</template>
