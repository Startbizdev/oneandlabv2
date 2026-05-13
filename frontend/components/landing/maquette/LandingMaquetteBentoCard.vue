<template>
  <article
    class="relative isolate flex min-h-[clamp(230px,28vw,340px)] flex-col justify-end gap-2 overflow-hidden rounded-[22px] p-7 text-white shadow-[0_4px_28px_rgba(15,23,42,0.1)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_48px_rgba(0,0,0,0.28)]"
  >
    <div
      class="absolute inset-0 z-0 rounded-[inherit] bg-cover bg-center"
      :style="{ backgroundImage: `url('${image}')` }"
    />
    <div
      class="pointer-events-none absolute inset-0 z-[1] rounded-[inherit] bg-gradient-to-br from-black/15 via-black/40 to-black/[0.58]"
    />
    <div class="relative z-[3] flex flex-col gap-2">
      <h3 class="m-0 flex flex-col items-start gap-1.5 leading-tight">
        <slot name="heading" />
      </h3>
      <p class="m-0 text-sm leading-snug text-white/82">
        <slot name="lead" />
      </p>
      <div class="flex flex-wrap items-center gap-x-[18px] gap-y-3 pt-1">
        <slot name="actions" />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
defineProps<{
  image: string;
}>();
</script>
