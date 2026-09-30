<template>
  <UAlert
    v-if="show"
    :color="offerCount > 0 ? 'info' : 'warning'"
    variant="soft"
    icon="i-lucide-building-2"
    class="rounded-xl"
    :title="offerCount > 0 ? 'Réseau laboratoire notifié' : 'Marque laboratoire à traiter'"
    data-testid="admin-lab-brand-banner"
  >
    <template #description>
      <div class="space-y-2 text-sm">
        <p v-if="offerCount > 0">
          Réseau choisi :
          <strong>{{ brandLabel }}</strong>.
          Envoyé à {{ offerCount }} labo(s) du réseau dont la zone couvre l’adresse. Le premier qui accepte prend le RDV.
        </p>
        <p v-else-if="labCount > 0">
          Réseau choisi :
          <strong>{{ brandLabel }}</strong>.
          Aucun labo du réseau disponible pour cette adresse ou ce créneau. Assignez un laboratoire ci-dessous.
        </p>
        <p v-else>
          Réseau choisi :
          <strong>{{ brandLabel }}</strong>.
          Aucun compte labo n’est rattaché à cette marque. Assignez un laboratoire ci-dessous ou rattachez des comptes dans « Marques laboratoire ».
        </p>
        <div v-if="logoUrl" class="flex items-center gap-2">
          <img :src="logoUrl" :alt="brandLabel" class="h-8 w-8 rounded-md object-contain bg-white p-0.5" />
          <UBadge :color="offerCount > 0 ? 'info' : 'warning'" variant="subtle" size="sm">
            {{ offerCount > 0 ? `${offerCount} offre(s) réseau` : 'Sans offre réseau' }}
          </UBadge>
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

const offerCount = computed(() => Number(props.appointment?.preferred_lab_brand_offer_count ?? 0) || 0);
const labCount = computed(() => Number(props.appointment?.preferred_lab_brand_lab_count ?? 0) || 0);
</script>
