<template>
  <div class="min-h-screen bg-gradient-to-br from-amber-50/80 via-white to-orange-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-amber-950/20 py-12 px-4 sm:px-6">
    <div class="container mx-auto max-w-2xl">
      <RegisterForm
        ref="formRef"
        role="pro"
        :initial-email="(route.query.email as string) ?? ''"
        title="Inscription Professionnel de santé"
        subtitle="Rejoignez OneAndLab en tant que professionnel de santé."
        header-icon="i-lucide-stethoscope"
        header-icon-bg="bg-amber-600"
        submit-label="Envoyer ma demande d'inscription"
        submit-color="warning"
        @submit="onSubmit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

import { apiFetch } from '~/utils/api';
const route = useRoute();
const toast = useToast();
const formRef = ref<{ setLoading: (v: boolean) => void } | null>(null);

async function onSubmit(payload: Record<string, string>) {
  formRef.value?.setLoading(true);
  try {
    const response = await apiFetch('/registration-requests', {
      method: 'POST',
      body: payload,
    });
    if (response?.success) {
      await navigateTo({ path: '/register/merci', query: { type: 'pro' } });
    } else {
      toast.add({
        title: 'Erreur',
        description: (response as any)?.error ?? 'Impossible d\'envoyer la demande.',
        color: 'error',
      });
    }
  } catch (e: any) {
    toast.add({
      title: 'Erreur',
      description: e?.message ?? 'Une erreur est survenue.',
      color: 'error',
    });
  } finally {
    formRef.value?.setLoading(false);
  }
}
</script>
