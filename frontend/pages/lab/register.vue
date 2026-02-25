<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-slate-900 py-12 px-4 sm:px-6">
    <div class="container mx-auto max-w-2xl">
      <RegisterForm
        ref="formRef"
        role="lab"
        :initial-email="(route.query.email as string) ?? ''"
        title="Inscription Laboratoire"
        subtitle="Rejoignez le réseau OneAndLab pour les prises de sang à domicile."
        header-icon="i-lucide-building-2"
        header-icon-bg="bg-blue-600"
        submit-label="Envoyer ma demande d'inscription"
        submit-color="primary"
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
const toast = useAppToast();
const formRef = ref<{ setLoading: (v: boolean) => void } | null>(null);

async function onSubmit(payload: Record<string, string>) {
  formRef.value?.setLoading(true);
  try {
    const response = await apiFetch('/registration-requests', {
      method: 'POST',
      body: payload,
    });
    if (response?.success) {
      await navigateTo({ path: '/register/merci', query: { type: 'lab' } });
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
