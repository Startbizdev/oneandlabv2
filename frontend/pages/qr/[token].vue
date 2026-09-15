<script setup lang="ts">
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
      const target = new URL(res.data.redirect_url, siteUrl);
      if (target.origin === new URL(siteUrl).origin && target.pathname === '/rendez-vous/nouveau') {
        destination = target.pathname + target.search + target.hash;
      }
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
      <p class="text-sm text-gray-600">Redirection vers la prise de rendez-vous…</p>
    </div>
  </div>
</template>
