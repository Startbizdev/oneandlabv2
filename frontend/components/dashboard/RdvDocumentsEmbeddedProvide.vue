<template>
  <div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue';

/** Active le layout liste compact (fiche RDV) pour `AppointmentDocumentsSection`. */
provide('rdvAppointmentDocumentsEmbedded', true);
</script>
