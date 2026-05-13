<template>
  <img
    v-if="imageSrc"
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
    imageSrc: string | null;
    iconName: string;
    iconColor?: string;
    imgClass?: string;
    iconClass?: string;
  }>(),
  {
    imgClass: 'object-contain',
    iconClass: '',
  },
);
</script>
