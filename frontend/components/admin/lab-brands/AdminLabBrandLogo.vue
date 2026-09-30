<template>
  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-default bg-muted/20">
    <img v-if="brand.logo_url" :src="brand.logo_url" :alt="`Logo ${brand.name}`" class="h-8 w-8 object-contain" />
    <UIcon v-else name="i-lucide-building-2" class="h-5 w-5 text-muted" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import type { LabBrandPublic } from '@oneandlab/shared-types';

defineProps<{ brand: Pick<LabBrandPublic, 'name' | 'logo_url'> }>();
</script>
