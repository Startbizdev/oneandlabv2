<template>
  <div>
    <TitleDashboard v-bind="passThroughTitle">
      <template v-if="$slots.description" #description>
        <slot name="description" />
      </template>
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </TitleDashboard>
    <div
      v-if="$slots.toolbar"
      :class="toolbarRowClass"
    >
      <slot name="toolbar" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface HeaderAction {
  label: string;
  icon?: string;
  color?: string;
  variant?: string;
  loading?: boolean;
  disabled?: boolean;
  class?: string;
  click?: () => void;
  to?: string;
}

const props = withDefaults(
  defineProps<{
    title: string;
    description?: string;
    badge?: string | number;
    badgeColor?: string;
    actions?: HeaderAction[];
    compact?: boolean;
    edgeBleed?: boolean;
  }>(),
  {
    badgeColor: 'primary',
    compact: false,
    edgeBleed: true,
  }
);

const passThroughTitle = computed(() => ({
  title: props.title,
  description: props.description,
  badge: props.badge,
  badgeColor: props.badgeColor,
  actions: props.actions,
  compact: props.compact,
  edgeBleed: props.edgeBleed,
}));

const toolbarRowClass = computed(() => {
  const base =
    'py-3 mb-6 border-b border-gray-200 bg-app-canvas/90 dark:bg-gray-900/60 dark:border-gray-800';
  return props.edgeBleed
    ? `-mx-4 md:-mx-6 px-4 md:px-6 ${base}`
    : `px-4 md:px-6 ${base}`;
});
</script>
