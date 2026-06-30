<template>
  <div />
</template>

<script setup lang="ts">
const route = useRoute()
const ville = (route.params.ville as string) || ''

if (ville) {
  await navigateTo(`/laboratoires/ville/${encodeURIComponent(ville)}`, { redirectCode: 301 })
} else {
  await navigateTo('/laboratoires', { redirectCode: 301 })
}
</script>
