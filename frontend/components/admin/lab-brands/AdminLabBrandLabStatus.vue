<template>
  <div class="min-w-0 space-y-1 text-xs">
    <p class="flex items-center gap-1.5 font-medium" :class="toneClass">
      <UIcon :name="toneIcon" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{{ status.label }}</span>
    </p>
    <p v-if="receivingNames.length" class="break-words text-muted">{{ receivingNames.join(', ') }}</p>
    <ul v-if="status.blocked.length" class="space-y-0.5 text-muted">
      <li v-for="item in status.blocked" :key="item.id" class="break-words">
        {{ item.label }} : {{ item.reason }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { brandLabStatus, labBlockReason, type LabAccountOption } from '~/utils/lab-brand-admin';

const props = defineProps<{
  labIds: readonly string[];
  labsById: ReadonlyMap<string, LabAccountOption>;
}>();

const status = computed(() => brandLabStatus(props.labIds, props.labsById));

const receivingNames = computed(() =>
  props.labIds
    .map(id => props.labsById.get(id))
    .filter((lab): lab is LabAccountOption => !!lab && labBlockReason(lab) === null)
    .map(lab => lab.label),
);

const toneClass = computed(() => ({
  success: 'text-success',
  warning: 'text-warning',
  neutral: 'text-muted',
})[status.value.tone]);

const toneIcon = computed(() => ({
  success: 'i-lucide-circle-check',
  warning: 'i-lucide-triangle-alert',
  neutral: 'i-lucide-inbox',
})[status.value.tone]);
</script>
