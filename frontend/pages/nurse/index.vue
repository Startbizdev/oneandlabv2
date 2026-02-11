<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'role'],
  role: 'nurse',
});

// Redirection vers la page des rendez-vous
await navigateTo('/nurse/appointments');
</script>
