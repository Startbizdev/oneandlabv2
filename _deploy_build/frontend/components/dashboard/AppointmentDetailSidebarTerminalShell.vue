<template>
  <div v-if="emptyState" class="flex flex-col gap-3">
    <UEmpty
      :icon="emptyState.icon"
      :title="emptyState.title"
      :description="emptyState.description"
      variant="naked"
      size="md"
    />
    <slot name="after" />
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getAppointmentSidebarTerminalEmpty } from '~/utils/appointment-sidebar-terminal';

const props = defineProps<{
  status: unknown;
}>();

const emptyState = computed(() => getAppointmentSidebarTerminalEmpty(props.status));
</script>
