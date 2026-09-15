<template>
  <img
    v-if="imageSrc && !imageFailed"
    :src="imageSrc"
    alt=""
    :class="imgClass"
    @error="imageFailed = true"
  />
  <UIcon
    v-else
    :name="iconName"
    :class="iconClass || 'size-5 shrink-0'"
    :style="iconColor ? { color: iconColor } : undefined"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Legacy emoji are accepted as metadata; the selected image or pictogram is displayed. */
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
const imageFailed = ref(false);
watch(() => props.imageSrc, () => { imageFailed.value = false; });
</script>
