<template>
  <UIcon
    :name="iconName"
    :class="iconClass || 'size-5 shrink-0'"
    :style="iconColor ? { color: iconColor } : undefined"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Legacy catalogue metadata is accepted for API compatibility; care pictograms are unified. */
    emoji?: string | null;
    imageSrc: string | null;
    iconName: string;
    iconColor?: string;
    imgClass?: string;
    iconClass?: string;
    emojiClass?: string;
  }>(),
  {
    emoji: null,
    imgClass: 'object-contain',
    iconClass: '',
    emojiClass: 'care-category-emoji text-[1.375rem] leading-none select-none',
  },
);
</script>
