<template>
  <span
    :class="[
      'inline-flex items-center rounded-md text-xs font-medium',
      sizeClasses,
      colorClasses,
      $attrs.class,
    ]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { BADGE_COLORS, STATUS_BADGE_COLOR, TYPE_BADGE_COLOR, getBadgeClasses, type BadgeColorKey, type BadgeVariant } from '~/utils/colors'

interface Props {
  /** Clé de couleur : primary | success | error | warning | neutral | blue, ou statut/type (pending, confirmed, blood_test, etc.) */
  color?: BadgeColorKey | string
  variant?: BadgeVariant
  size?: 'xs' | 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  color: 'neutral',
  variant: 'subtle',
  size: 'sm',
})

const sizeClasses = computed(() => {
  const map = {
    xs: 'px-1.5 py-0.5',
    sm: 'px-2 py-0.5',
    md: 'px-2.5 py-1',
  }
  return map[props.size] ?? map.sm
})

const colorClasses = computed(() => {
  const key =
    (STATUS_BADGE_COLOR[props.color] ?? TYPE_BADGE_COLOR[props.color] ?? props.color) as BadgeColorKey
  return getBadgeClasses(key, props.variant)
})
</script>
