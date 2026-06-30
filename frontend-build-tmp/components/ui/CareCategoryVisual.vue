<template>
  <span
    v-if="emoji"
    :class="emojiClass"
    role="img"
    aria-hidden="true"
  >{{ emoji }}</span>
  <img
    v-else-if="imageSrc"
    :src="imageSrc"
    alt=""
    draggable="false"
    loading="lazy"
    decoding="async"
    :class="imgClass"
  />
  <UIcon
    v-else
    :name="iconName"
    :class="iconClass"
    :style="iconColor ? { color: iconColor } : undefined"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Emoji depuis care_categories.icon (prioritaire sur image / Lucide). */
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
