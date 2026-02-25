<template>
  <div>
    <LabDashboard mode="lab" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'lab',
});
</script>
