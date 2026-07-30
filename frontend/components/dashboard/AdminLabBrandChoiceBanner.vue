<template>
  <UAlert
    v-if="show"
    color="warning"
    variant="soft"
    icon="i-lucide-building-2"
    class="rounded-xl"
    title="Marque laboratoire à traiter"
  >
    <template #description>
      <div class="space-y-2 text-sm">
        <p>
          Le patient a choisi la marque
          <strong>{{ brandLabel }}</strong>
          sans dispatch automatique. Contactez la marque ou assignez un laboratoire Cary inscrit ci-dessous.
        </p>
        <div v-if="logoUrl" class="flex items-center gap-2">
          <img :src="logoUrl" :alt="brandLabel" class="h-8 w-8 rounded-md object-contain bg-white p-0.5" />
          <UBadge color="warning" variant="subtle" size="sm">Sans offre zone</UBadge>
        </div>
      </div>
    </template>
  </UAlert>
</template>

<script setup lang="ts">
const props = defineProps<{
  appointment: Record<string, unknown> | null | undefined;
}>();

const show = computed(() => {
  const a = props.appointment;
  if (!a || a.type !== 'blood_test') return false;
  if (a.assigned_lab_id) return false;
  const mode = (a.lab_preference_mode as string) || (a.form_data as Record<string, unknown> | undefined)?.lab_preference_mode;
  return mode === 'brand_choice';
});

const brandLabel = computed(() => {
  const a = props.appointment;
  if (!a) return '—';
  return (
    (a.preferred_lab_brand_name as string) ||
    ((a.form_data as Record<string, unknown> | undefined)?.preferred_lab_brand_name as string) ||
    'Non renseignée'
  );
});

const logoUrl = computed(() => {
  const a = props.appointment;
  if (!a) return null;
  return (a.preferred_lab_brand_logo_url as string) || null;
});
</script>
