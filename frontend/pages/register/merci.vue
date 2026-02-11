<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50/50 via-white to-primary-100/20 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950/20 flex items-center justify-center py-12 px-4">
    <UCard class="w-full max-w-lg shadow-xl border-0 overflow-hidden">
      <template #header>
        <div class="text-center py-4">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50 mb-4">
            <UIcon name="i-lucide-check-circle" class="w-10 h-10 text-primary" />
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-foreground">
            Demande bien reçue
          </h1>
          <p class="text-muted mt-2">
            Merci pour votre inscription sur OneAndLab.
          </p>
        </div>
      </template>
      <div class="space-y-4 text-center">
        <p class="text-foreground/90 leading-relaxed">
          Notre équipe va <strong>analyser votre profil</strong> et reviendra vers vous dans les plus brefs délais pour finaliser votre accès à la plateforme.
        </p>
        <p class="text-sm text-muted">
          Vous recevrez un email à l’adresse indiquée dès que votre compte sera activé.
        </p>
        <div class="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <UButton to="/" variant="soft" color="primary" size="lg">
            Retour à l'accueil
          </UButton>
          <UButton to="/login" variant="outline" color="neutral" size="lg">
            Aller à la connexion
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const route = useRoute();
const type = computed(() => (route.query.type as string) || '');
</script>
