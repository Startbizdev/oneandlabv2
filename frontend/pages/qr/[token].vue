<script setup lang="ts">
import { safeQrRedirectPath } from '~/utils/qr-redirect';

const route = useRoute();
const config = useRuntimeConfig();

const token = computed(() => String(route.params.token ?? '').trim());

definePageMeta({ layout: false });

useHead({
  title: 'Redirection Cary',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
});

if (import.meta.server && token.value) {
  const apiBase = (config.public as { apiBase?: string }).apiBase || 'https://cary.bio/api';
  const siteUrl = (config.public as { siteUrl?: string }).siteUrl || 'https://cary.bio';
  const base = apiBase.startsWith('http') ? apiBase : (config.apiInternalBase || `${siteUrl.replace(/\/$/, '')}${apiBase}`);
  let destination = '';
  try {
    const res = await $fetch<{ success: boolean; data?: { redirect_url?: string } }>(
      `${base}/qr/resolve?token=${encodeURIComponent(token.value)}`,
    );
    if (res.success && res.data?.redirect_url) {
      destination = safeQrRedirectPath(res.data.redirect_url, siteUrl);
    }
  } catch {
    // Keep the token: the client can retry the existing QR redirect endpoint.
  }
  if (destination) await navigateTo(destination, { redirectCode: 302, external: false });
}

onMounted(async () => {
  if (!token.value) return;
  const origin = window.location.origin;
  window.location.replace(`${origin}/api/qr/${encodeURIComponent(token.value)}`);
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="text-center">
      <UIcon name="i-lucide-loader-2" class="mx-auto mb-3 h-8 w-8 animate-spin text-teal-600" />
      <p class="text-sm text-gray-600">Redirection en cours…</p>
    </div>
  </div>
</template>
